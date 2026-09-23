<?php

namespace App\Services\E2e;

use App\Models\AuditedBallot;
use App\Models\E2eBallot;
use App\Models\Election;
use App\Models\PartialDecryption;
use App\Models\TallyAggregate;

/**
 * The public bulletin board: everything anyone needs to check the election
 * themselves. It publishes ciphertexts, proofs and pseudonymous credentials —
 * never a voter identity, a country, or a time a ballot was cast.
 */
class BulletinBoardService
{
    public function __construct(private TallyService $tally, private KeyCeremonyService $ceremony)
    {
    }

    public function clientBundle(): ?array
    {
        $path = config('evoting.client_bundle_manifest');
        if (!is_string($path) || !is_file($path)) {
            return null;
        }
        $data = json_decode((string) file_get_contents($path), true);

        return is_array($data) && isset($data['sha256'], $data['file']) ? ['file' => $data['file'], 'sha256' => $data['sha256']] : null;
    }

    public function electionHeader(Election $election): array
    {
        return [
            'id' => $election->id,
            'title' => $election->title,
            'status' => $election->status,
            'crypto_scheme' => $election->crypto_scheme,
            'tally_status' => $election->tally_status,
            'threshold' => (int) $election->trustee_threshold,
            'trustee_count' => (int) $election->trustee_count,
            'joint_public_key' => $election->joint_public_key,
            'key_ceremony_status' => $election->key_ceremony_status,
            'diaspora_voting_enabled' => (bool) $election->diaspora_voting_enabled,
            'starts_at' => $election->starts_at?->toISOString(),
            'ends_at' => $election->ends_at?->toISOString(),
            'results_published_at' => $election->results_published_at?->toISOString(),
        ];
    }

    public function trustees(Election $election): array
    {
        return $election->trustees()->with('user:id,name')->get()->map(fn ($t) => [
            'trustee_index' => $t->trustee_index,
            'name' => $t->user?->name ?? "Trustee {$t->trustee_index}",
            'round1' => $t->round1,
            'share_public_key' => $t->share_public_key,
        ])->all();
    }

    public function summary(Election $election): array
    {
        $counts = E2eBallot::where('election_id', $election->id)
            ->selectRaw('status, COUNT(*) as n')->groupBy('status')->pluck('n', 'status');

        return [
            'election' => $this->electionHeader($election),
            'client_bundle' => $this->clientBundle(),
            'trustees' => $this->trustees($election),
            'manifests' => $election->manifests()->orderBy('id')->get()->map->toCrypto()->all(),
            'counts' => [
                'cast' => (int) $counts->sum(),
                'counted' => (int) ($counts['counted'] ?? 0),
                'superseded' => (int) ($counts['superseded'] ?? 0),
                'audited' => AuditedBallot::where('election_id', $election->id)->count(),
            ],
            'tally' => [
                'status' => $election->tally_status,
                'partials_submitted' => PartialDecryption::where('election_id', $election->id)->pluck('trustee_index'),
                'used_trustees' => $this->tally->usedTrustees($election),
            ],
        ];
    }

    /** One page of board rows, newest last; optional short/full tracking-code filter. */
    public function page(Election $election, ?string $query, int $perPage = 25, string $kind = 'cast'): array
    {
        $q = $kind === 'audited'
            ? AuditedBallot::where('election_id', $election->id)
            : E2eBallot::where('election_id', $election->id);

        if ($query) {
            $clean = strtolower(preg_replace('/[^0-9a-zA-Z]/', '', $query));
            if (strlen($clean) === 64) {
                $q->where('tracking_code', $clean);
            } else {
                $short = implode('-', str_split(strtoupper(strtr($clean, ['o' => '0', 'i' => '1', 'l' => '1'])), 4));
                $q->where('short_code', 'like', $short . '%');
            }
        }

        $p = $q->orderBy('id')->paginate(min(max($perPage, 1), 100));

        return [
            'data' => collect($p->items())->map(fn ($row) => $kind === 'audited' ? $this->auditedRow($row) : $this->ballotRow($row))->all(),
            'current_page' => $p->currentPage(),
            'last_page' => $p->lastPage(),
            'total' => $p->total(),
        ];
    }

    public function ballotRow(E2eBallot $row): array
    {
        return [
            'sequence' => $row->id,
            'tracking_code' => $row->tracking_code,
            'short_code' => $row->short_code,
            'status' => $row->status,
            'ballot' => [
                'election_id' => (int) $row->election_id,
                'manifest_id' => (int) $row->manifest_id,
                'manifest_hash' => $row->manifest_hash ?? optional(\App\Models\BallotManifest::find($row->manifest_id))->hash,
                'credential' => $row->credential,
                'ciphertexts' => $row->ciphertexts,
                'option_proofs' => $row->proofs['option_proofs'] ?? [],
                'constraint_proofs' => $row->proofs['constraint_proofs'] ?? [],
            ],
        ];
    }

    public function auditedRow(AuditedBallot $row): array
    {
        return [
            'tracking_code' => $row->tracking_code,
            'short_code' => $row->short_code,
            'status' => 'audited',
            'audit' => [
                'election_id' => (int) $row->election_id,
                'manifest_id' => (int) $row->manifest_id,
                'manifest_hash' => optional(\App\Models\BallotManifest::find($row->manifest_id))->hash,
                'ciphertexts' => $row->ciphertexts,
                'selections' => $row->selections,
                'randomness' => $row->randomness,
            ],
        ];
    }

    /** Finds a tracking code among cast and audited ballots. */
    public function lookup(Election $election, string $code): ?array
    {
        foreach (['cast', 'audited'] as $kind) {
            $page = $this->page($election, $code, 2, $kind);
            if ($page['total'] === 1) {
                return $page['data'][0];
            }
        }

        return null;
    }

    /** The complete board — the independent verifier's input. */
    public function export(Election $election): array
    {
        $hashes = $election->manifests()->pluck('hash', 'id');
        $ballots = [];
        E2eBallot::where('election_id', $election->id)->orderBy('id')->chunk(500, function ($rows) use (&$ballots, $hashes) {
            foreach ($rows as $row) {
                $row->manifest_hash = $hashes[$row->manifest_id] ?? null;
                $ballots[] = $this->ballotRow($row);
            }
        });

        $audited = AuditedBallot::where('election_id', $election->id)->orderBy('id')->get()->map(fn ($r) => $this->auditedRow($r))->all();

        $tally = null;
        if ($election->tally_status === 'published') {
            $aggregates = TallyAggregate::where('election_id', $election->id)->orderBy('id')->get();
            $tally = [
                'aggregates' => $aggregates->map(fn ($a) => ['key' => $a->key, 'a' => $a->a, 'b' => $a->b, 'constituency_id' => $a->constituency_id])->all(),
                'ballot_counts' => (object) $aggregates->groupBy('constituency_id')->map(fn ($g) => (int) $g->first()->ballot_count)->all(),
                'partials' => PartialDecryption::where('election_id', $election->id)->orderBy('trustee_index')->get()
                    ->map(fn ($p) => ['trustee_index' => $p->trustee_index, 'shares' => $p->shares])->all(),
                'used_trustees' => $this->tally->usedTrustees($election),
                'results' => $aggregates->map(fn ($a) => ['key' => $a->key, 'count' => (int) $a->count])->all(),
            ];
        }

        return [
            'protocol' => 'evote-v1',
            'election' => $this->electionHeader($election),
            'client_bundle' => $this->clientBundle(),
            'trustees' => $this->trustees($election),
            'manifests' => $election->manifests()->orderBy('id')->get()->map->toCrypto()->all(),
            'ballots' => $ballots,
            'audited_ballots' => $audited,
            'tally' => $tally,
        ];
    }
}
