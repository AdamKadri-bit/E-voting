<?php

namespace App\Services\E2e;

use App\Crypto\Group;
use App\Crypto\Threshold;
use App\Exceptions\VotingException;
use App\Models\Election;
use App\Models\ElectionTrustee;
use App\Models\TrusteeShareTransfer;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates the three-round distributed key generation. The server only
 * relays and checks public material: Schnorr proofs in round 1, the shape of
 * the sealed shares in round 2, and in round 3 that each trustee's reported
 * s_j·G matches what the public commitments say it must be.
 */
class KeyCeremonyService
{
    public function __construct(private AuditLogService $audit)
    {
    }

    /** Admin: choose the trustees and k. Only before any trustee has started. */
    public function assign(Election $election, array $userIds, int $threshold, ?User $actor): void
    {
        if ($election->status !== 'draft') {
            throw new VotingException('Trustees can only be changed while the election is a draft.', 'not_draft');
        }
        if (in_array($election->key_ceremony_status, ['in_progress', 'complete'], true)) {
            throw new VotingException('The key ceremony has started; reset it before changing trustees.', 'ceremony_started', 409);
        }

        $userIds = array_values(array_unique(array_map('intval', $userIds)));
        $n = count($userIds);
        $max = (int) config('evoting.trustees.max_count', 9);
        if ($n < 1 || $n > $max) {
            throw new VotingException("Choose between 1 and {$max} trustees.", 'bad_trustees');
        }
        if ($threshold < 1 || $threshold > $n) {
            throw new VotingException('The threshold must be between 1 and the number of trustees.', 'bad_threshold');
        }
        if (User::whereIn('id', $userIds)->whereNotNull('email_verified_at')->count() !== $n) {
            throw new VotingException('Every trustee needs a verified account.', 'bad_trustees');
        }

        DB::transaction(function () use ($election, $userIds, $threshold, $n) {
            $this->clear($election);
            foreach ($userIds as $i => $uid) {
                ElectionTrustee::create(['election_id' => $election->id, 'user_id' => $uid, 'trustee_index' => $i + 1]);
            }
            $election->update(['trustee_threshold' => $threshold, 'trustee_count' => $n, 'key_ceremony_status' => 'pending', 'joint_public_key' => null]);
        });

        $this->audit->log($actor, 'admin.election.trustees_assigned', ['election_id' => $election->id, 'trustees' => $n, 'threshold' => $threshold]);
    }

    public function reset(Election $election, ?User $actor): void
    {
        if ($election->status !== 'draft') {
            throw new VotingException('Only a draft election\'s ceremony can be reset.', 'not_draft');
        }
        DB::transaction(function () use ($election) {
            TrusteeShareTransfer::where('election_id', $election->id)->delete();
            ElectionTrustee::where('election_id', $election->id)->update([
                'round1' => null, 'round1_at' => null, 'round2_at' => null,
                'share_public_key' => null, 'complaints' => null, 'round3_at' => null,
            ]);
            $election->update(['key_ceremony_status' => 'pending', 'joint_public_key' => null]);
        });
        $this->audit->log($actor, 'admin.election.ceremony_reset', ['election_id' => $election->id]);
    }

    public function seatFor(Election $election, User $user): ElectionTrustee
    {
        $seat = ElectionTrustee::where('election_id', $election->id)->where('user_id', $user->id)->first();
        if (!$seat) {
            throw new VotingException('You are not a trustee of this election.', 'not_trustee', 403);
        }

        return $seat;
    }

    public function phase(Election $election): string
    {
        $t = $election->trustees()->get();
        if ($election->key_ceremony_status === 'complete') {
            return 'complete';
        }
        if ($election->key_ceremony_status === 'failed') {
            return 'failed';
        }
        if ($t->isEmpty()) {
            return 'unassigned';
        }
        if ($t->contains(fn ($x) => $x->round1_at === null)) {
            return 'round1';
        }
        if ($t->contains(fn ($x) => $x->round2_at === null)) {
            return 'round2';
        }

        return 'round3';
    }

    public function submitRound1(Election $election, ElectionTrustee $seat, array $payload): void
    {
        $this->expectPhase($election, 'round1');
        if ($seat->round1_at !== null) {
            throw new VotingException('You already published round 1.', 'done', 409);
        }
        $payload['trustee_index'] = $seat->trustee_index;
        if (!Threshold::verifyRound1($election->id, $election->trustee_threshold, $payload)) {
            throw new VotingException('Round 1 rejected: a proof of knowledge does not verify.', 'invalid_proof');
        }
        $seat->update(['round1' => $this->onlyRound1($payload), 'round1_at' => now()]);
        $election->update(['key_ceremony_status' => 'in_progress']);
        $this->audit->log($seat->user, 'trustee.round1', ['election_id' => $election->id, 'trustee_index' => $seat->trustee_index]);
    }

    public function submitRound2(Election $election, ElectionTrustee $seat, array $shares): void
    {
        $this->expectPhase($election, 'round2');
        if ($seat->round2_at !== null) {
            throw new VotingException('You already sent your shares.', 'done', 409);
        }
        $expected = $election->trustees()->where('trustee_index', '!=', $seat->trustee_index)->pluck('trustee_index')->sort()->values()->all();
        $to = collect($shares)->pluck('to')->map(fn ($x) => (int) $x)->sort()->values()->all();
        if ($to !== $expected) {
            throw new VotingException('Send exactly one share to every other trustee.', 'bad_shares');
        }

        DB::transaction(function () use ($election, $seat, $shares) {
            foreach ($shares as $s) {
                foreach (['ephemeral', 'nonce', 'ciphertext'] as $f) {
                    if (!is_string($s[$f] ?? null) || !ctype_xdigit($s[$f])) {
                        throw new VotingException('Malformed share.', 'bad_shares');
                    }
                }
                Group::pointFromHex($s['ephemeral']);
                TrusteeShareTransfer::create([
                    'election_id' => $election->id,
                    'from_index' => $seat->trustee_index,
                    'to_index' => (int) $s['to'],
                    'box' => ['ephemeral' => $s['ephemeral'], 'nonce' => $s['nonce'], 'ciphertext' => $s['ciphertext']],
                ]);
            }
            $seat->update(['round2_at' => now()]);
        });
        $this->audit->log($seat->user, 'trustee.round2', ['election_id' => $election->id, 'trustee_index' => $seat->trustee_index]);
    }

    /** Shares sealed to this trustee (still encrypted; only its own key opens them). */
    public function incoming(Election $election, ElectionTrustee $seat): array
    {
        return TrusteeShareTransfer::where('election_id', $election->id)
            ->where('to_index', $seat->trustee_index)
            ->get()
            ->map(fn ($t) => array_merge($t->box, ['from' => $t->from_index, 'to' => $t->to_index]))
            ->all();
    }

    public function submitRound3(Election $election, ElectionTrustee $seat, ?string $sharePublicKey, array $complaints): void
    {
        $this->expectPhase($election, 'round3');
        if ($seat->round3_at !== null) {
            throw new VotingException('You already confirmed your key share.', 'done', 409);
        }

        if ($complaints !== []) {
            $seat->update(['complaints' => array_values(array_map('intval', $complaints)), 'round3_at' => now()]);
            $election->update(['key_ceremony_status' => 'failed']);
            $this->audit->log($seat->user, 'trustee.complaint', ['election_id' => $election->id, 'trustee_index' => $seat->trustee_index, 'against' => $complaints]);

            return;
        }

        $round1s = $election->trustees()->get()->pluck('round1')->all();
        $expected = bin2hex(Threshold::sharePublicKey($round1s, $seat->trustee_index));
        if ($sharePublicKey !== $expected) {
            throw new VotingException('Your key share does not match the published commitments.', 'bad_share_key');
        }

        DB::transaction(function () use ($election, $seat, $sharePublicKey, $round1s) {
            $seat->update(['share_public_key' => $sharePublicKey, 'complaints' => [], 'round3_at' => now()]);
            $pending = ElectionTrustee::where('election_id', $election->id)->whereNull('round3_at')->count();
            if ($pending === 0) {
                $election->update([
                    'key_ceremony_status' => 'complete',
                    'joint_public_key' => bin2hex(Threshold::jointPublicKey($round1s)),
                ]);
            }
        });

        $this->audit->log($seat->user, 'trustee.round3', ['election_id' => $election->id, 'trustee_index' => $seat->trustee_index]);
        if ($election->fresh()->key_ceremony_status === 'complete') {
            $this->audit->log(null, 'election.key_ceremony_complete', ['election_id' => $election->id, 'joint_public_key' => $election->fresh()->joint_public_key]);
        }
    }

    public function publicState(Election $election): array
    {
        return [
            'phase' => $this->phase($election),
            'status' => $election->key_ceremony_status,
            'threshold' => $election->trustee_threshold,
            'trustee_count' => $election->trustee_count,
            'joint_public_key' => $election->joint_public_key,
            'trustees' => $election->trustees()->with('user:id,name,email')->get()->map(fn ($t) => [
                'trustee_index' => $t->trustee_index,
                'name' => $t->user?->name,
                'round1' => $t->round1,
                'round1_done' => $t->round1_at !== null,
                'round2_done' => $t->round2_at !== null,
                'round3_done' => $t->round3_at !== null,
                'share_public_key' => $t->share_public_key,
                'complaints' => $t->complaints ?? [],
            ])->all(),
        ];
    }

    private function expectPhase(Election $election, string $phase): void
    {
        if ($election->status !== 'draft') {
            throw new VotingException('The key ceremony runs while the election is still a draft.', 'not_draft');
        }
        $now = $this->phase($election);
        if ($now !== $phase) {
            throw new VotingException("The ceremony is at {$now}, not {$phase}.", 'wrong_phase', 409);
        }
    }

    private function onlyRound1(array $p): array
    {
        return [
            'trustee_index' => (int) $p['trustee_index'],
            'comm_public_key' => $p['comm_public_key'],
            'comm_proof' => ['r' => $p['comm_proof']['r'], 'z' => $p['comm_proof']['z']],
            'commitments' => array_values($p['commitments']),
            'commitment_proofs' => array_map(fn ($x) => ['r' => $x['r'], 'z' => $x['z']], array_values($p['commitment_proofs'])),
        ];
    }

    private function clear(Election $election): void
    {
        TrusteeShareTransfer::where('election_id', $election->id)->delete();
        ElectionTrustee::where('election_id', $election->id)->delete();
    }
}
