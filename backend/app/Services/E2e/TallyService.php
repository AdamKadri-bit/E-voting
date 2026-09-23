<?php

namespace App\Services\E2e;

use App\Crypto\ElGamal;
use App\Crypto\Group;
use App\Crypto\Threshold;
use App\Exceptions\VotingException;
use App\Models\BallotManifest;
use App\Models\E2eBallot;
use App\Models\Election;
use App\Models\ElectionTrustee;
use App\Models\PartialDecryption;
use App\Models\TallyAggregate;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

/**
 * Homomorphic tallying and threshold decryption.
 *
 * aggregate()  adds every counted ballot's ciphertexts per (constituency, option);
 *              no ballot is opened, and nothing here could open one.
 * submitPartial() stores a trustee's partial decryption after checking its
 *              Chaum–Pedersen proof; once k valid ones exist, finalize()
 *              combines them and recovers each count by baby-step giant-step.
 */
class TallyService
{
    public function __construct(private AuditLogService $audit)
    {
    }

    public static function key(int $constituencyId, string $type, int $id): string
    {
        return "c{$constituencyId}/{$type}:{$id}";
    }

    public function aggregateIfReady(Election $election): void
    {
        if ($election->isE2e() && $election->status === 'closed' && $election->key_ceremony_status === 'complete' && $election->tally_status === 'none') {
            $this->aggregate($election);
        }
    }

    public function aggregate(Election $election): int
    {
        if (!$election->isE2e() || $election->status !== 'closed') {
            throw new VotingException('Only a closed end-to-end election can be tallied.', 'not_closed');
        }
        if ($election->key_ceremony_status !== 'complete') {
            throw new VotingException('The election has no key.', 'keys_not_ready');
        }
        if ($election->tally_status !== 'none') {
            throw new VotingException('The tally has already been formed.', 'already_tallied', 409);
        }

        $manifests = BallotManifest::where('election_id', $election->id)->get()->keyBy('id');
        $sums = [];
        $ballotCounts = [];
        $meta = [];

        // Every option of every ballot style gets a total, even with no ballots (0 is a result too).
        foreach ($manifests as $m) {
            foreach ($m->options as $o) {
                $k = self::key((int) $m->constituency_id, $o['type'], (int) $o['id']);
                $sums[$k] ??= ElGamal::zero();
                $meta[$k] = [(int) $m->constituency_id, $o['type'], (int) $o['id']];
            }
            $ballotCounts[(int) $m->constituency_id] ??= 0;
        }

        E2eBallot::where('election_id', $election->id)->where('status', 'counted')->orderBy('id')
            ->chunk(500, function ($rows) use ($manifests, &$sums, &$ballotCounts) {
                foreach ($rows as $row) {
                    $m = $manifests[$row->manifest_id];
                    $ballotCounts[(int) $m->constituency_id]++;
                    foreach ($m->options as $i => $o) {
                        $k = self::key((int) $m->constituency_id, $o['type'], (int) $o['id']);
                        $sums[$k] = ElGamal::add($sums[$k], ElGamal::fromJson($row->ciphertexts[$i]));
                    }
                }
            });

        DB::transaction(function () use ($election, $sums, $meta, $ballotCounts) {
            TallyAggregate::where('election_id', $election->id)->delete();
            PartialDecryption::where('election_id', $election->id)->delete();
            foreach ($sums as $k => $ct) {
                [$cid, $type, $id] = $meta[$k];
                $j = ElGamal::toJson($ct);
                TallyAggregate::create([
                    'election_id' => $election->id, 'constituency_id' => $cid, 'option_type' => $type, 'option_id' => $id,
                    'key' => $k, 'a' => $j['a'], 'b' => $j['b'], 'ballot_count' => $ballotCounts[$cid] ?? 0,
                ]);
            }
            $election->update(['tally_status' => 'decrypting']);
        });

        $this->audit->log(null, 'election.tally_aggregated', ['election_id' => $election->id, 'totals' => count($sums)]);

        return count($sums);
    }

    public function aggregatesJson(Election $election): array
    {
        return TallyAggregate::where('election_id', $election->id)->orderBy('id')->get()
            ->map(fn ($a) => ['key' => $a->key, 'a' => $a->a, 'b' => $a->b, 'constituency_id' => $a->constituency_id])
            ->all();
    }

    public function submitPartial(Election $election, ElectionTrustee $seat, array $shares): array
    {
        if ($election->tally_status !== 'decrypting') {
            throw new VotingException('The tally is not waiting for decryption.', 'not_decrypting', 409);
        }
        if (PartialDecryption::where('election_id', $election->id)->where('trustee_index', $seat->trustee_index)->exists()) {
            throw new VotingException('You already submitted your partial decryption.', 'done', 409);
        }

        $round1s = $election->trustees()->get()->pluck('round1')->all();
        $S = Threshold::sharePublicKey($round1s, $seat->trustee_index);
        $byKey = collect($shares)->keyBy('key');
        $aggregates = $this->aggregatesJson($election);

        if (count($shares) !== count($aggregates)) {
            throw new VotingException('Decrypt every total exactly once.', 'bad_partial');
        }
        foreach ($aggregates as $agg) {
            if (!Threshold::verifyPartial($election->id, $seat->trustee_index, $S, $agg, $byKey[$agg['key']] ?? null)) {
                throw new VotingException("Partial decryption rejected: proof for {$agg['key']} does not verify.", 'invalid_proof');
            }
        }

        PartialDecryption::create([
            'election_id' => $election->id,
            'trustee_index' => $seat->trustee_index,
            'shares' => array_map(fn ($a) => [
                'key' => $a['key'],
                'm' => $byKey[$a['key']]['m'],
                'proof' => ['c' => $byKey[$a['key']]['proof']['c'], 'z' => $byKey[$a['key']]['proof']['z']],
            ], $aggregates),
        ]);
        $this->audit->log($seat->user, 'trustee.partial_decryption', ['election_id' => $election->id, 'trustee_index' => $seat->trustee_index]);

        $have = PartialDecryption::where('election_id', $election->id)->count();
        if ($have >= $election->trustee_threshold) {
            $this->finalize($election);
        }

        return ['submitted' => $have, 'needed' => $election->trustee_threshold, 'tally_status' => $election->fresh()->tally_status];
    }

    /** Combines the first k submitted partials (by trustee index) and recovers every count. */
    public function finalize(Election $election): void
    {
        $k = $election->trustee_threshold;
        $partials = PartialDecryption::where('election_id', $election->id)->orderBy('trustee_index')->get();
        if ($partials->count() < $k) {
            throw new VotingException("Need {$k} partial decryptions, have {$partials->count()}.", 'below_threshold', 409);
        }
        $used = $partials->take($k);

        DB::transaction(function () use ($election, $used) {
            foreach (TallyAggregate::where('election_id', $election->id)->get() as $agg) {
                $parts = [];
                foreach ($used as $p) {
                    $share = collect($p->shares)->firstWhere('key', $agg->key);
                    $parts[$p->trustee_index] = Group::pointFromHex($share['m']);
                }
                $mG = Threshold::combine($agg->b, $parts);
                $agg->update(['count' => Threshold::discreteLog($mG, (int) $agg->ballot_count)]);
            }
            $election->update(['tally_status' => 'published', 'results_published_at' => now()]);
        });

        $this->audit->log(null, 'election.results_published', [
            'election_id' => $election->id,
            'trustees_used' => $used->pluck('trustee_index')->all(),
        ]);
    }

    /** Indices of the trustees whose partials produced the published counts. */
    public function usedTrustees(Election $election): array
    {
        if ($election->tally_status !== 'published') {
            return [];
        }

        return PartialDecryption::where('election_id', $election->id)->orderBy('trustee_index')
            ->limit($election->trustee_threshold)->pluck('trustee_index')->map(fn ($x) => (int) $x)->all();
    }

    /**
     * Published counts in the shape the legacy geo/results services expect:
     * constituency_id => ['ballots' => n, 'lists' => [id => votes], 'candidates' => [id => votes]].
     */
    public function publishedTallies(Election $election): array
    {
        if ($election->tally_status !== 'published') {
            return [];
        }
        $out = [];
        foreach (TallyAggregate::where('election_id', $election->id)->get() as $a) {
            $cid = $a->constituency_id;
            $out[$cid] ??= ['ballots' => $a->ballot_count, 'lists' => [], 'candidates' => []];
            $bucket = $a->option_type === 'list' ? 'lists' : 'candidates';
            if ($a->count > 0) {
                $out[$cid][$bucket][$a->option_id] = ($out[$cid][$bucket][$a->option_id] ?? 0) + $a->count;
            }
        }

        return $out;
    }
}
