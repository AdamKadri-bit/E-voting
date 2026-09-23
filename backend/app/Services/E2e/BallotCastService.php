<?php

namespace App\Services\E2e;

use App\Crypto\BallotCrypto;
use App\Exceptions\VotingException;
use App\Models\AuditedBallot;
use App\Models\BallotManifest;
use App\Models\E2eBallot;
use App\Models\Election;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Accepts encrypted ballots onto the bulletin board.
 *
 * Nothing about a ballot's content is visible here: the server checks the
 * zero-knowledge proofs (a ballot that is not a single valid vote is refused),
 * files it under the voter's pseudonymous credential, and marks any earlier
 * ballot from the same credential as superseded — only the last one counts.
 */
class BallotCastService
{
    public function __construct(
        private VoterEligibility $eligibility,
        private ManifestService $manifests,
        private CredentialService $credentials,
        private ParticipationService $participation,
    ) {
    }

    /** What the voter's browser needs to encrypt: manifest, election key and credential. */
    public function ballotFor(User $user, Election $election): array
    {
        $ctx = $this->eligibility->resolve($user, $election);
        $manifest = $this->manifests->forVoter($election, $ctx['constituency'], $ctx['district']->id);

        $previous = E2eBallot::where('election_id', $election->id)
            ->where('credential', $this->credentials->credentialFor($election->id, $ctx['voter']->id))
            ->count();

        return [
            'manifest' => $manifest->toCrypto(),
            'joint_public_key' => $election->joint_public_key,
            'credential' => $this->credentials->credentialFor($election->id, $ctx['voter']->id),
            'has_voted' => $previous > 0,
            'district' => ['id' => $ctx['district']->id, 'name' => $ctx['district']->name_en],
            'constituency' => ['id' => $ctx['constituency']->id, 'name' => $ctx['constituency']->name_en ?? $ctx['constituency']->name_ar],
        ];
    }

    public function cast(User $user, Election $election, array $ballot, ?string $ip): array
    {
        $ctx = $this->eligibility->resolve($user, $election);
        $manifest = $this->manifests->forVoter($election, $ctx['constituency'], $ctx['district']->id);
        $credential = $this->credentials->credentialFor($election->id, $ctx['voter']->id);

        if ((int) ($ballot['manifest_id'] ?? 0) !== $manifest->id) {
            throw new VotingException('This ballot is for a different ballot style than yours.', 'wrong_manifest');
        }
        if (($ballot['credential'] ?? null) !== $credential) {
            throw new VotingException('This ballot was prepared for a different voter credential.', 'wrong_credential');
        }

        $check = BallotCrypto::verify($manifest->toCrypto(), $election->joint_public_key, $ballot);
        if (!$check['ok']) {
            throw new VotingException('Ballot rejected: its validity proof does not verify (' . $check['reason'] . ').', 'invalid_proof');
        }

        $tracking = BallotCrypto::trackingHash($election->id, $manifest->hash, $ballot['ciphertexts']);

        $row = DB::transaction(function () use ($election, $manifest, $credential, $ballot, $tracking, $ctx) {
            if (E2eBallot::where('tracking_code', $tracking)->exists() || AuditedBallot::where('tracking_code', $tracking)->exists()) {
                throw new VotingException('This exact ballot was already submitted.', 'duplicate');
            }

            // Serialises concurrent casts by the same voter across both flows.
            E2eBallot::where('election_id', $election->id)
                ->where('credential', $credential)
                ->lockForUpdate()
                ->get();

            E2eBallot::where('election_id', $election->id)
                ->where('credential', $credential)
                ->where('status', 'counted')
                ->update(['status' => 'superseded']);

            return E2eBallot::create([
                'election_id' => $election->id,
                'manifest_id' => $manifest->id,
                'constituency_id' => $ctx['constituency']->id,
                'credential' => $credential,
                'tracking_code' => $tracking,
                'short_code' => BallotCrypto::shortCode($tracking),
                'ciphertexts' => array_values($ballot['ciphertexts']),
                'proofs' => [
                    'option_proofs' => array_values($ballot['option_proofs']),
                    'constraint_proofs' => array_values($ballot['constraint_proofs']),
                ],
                'status' => 'counted',
            ]);
        });

        $this->participation->record($election, $ctx['voter'], $user, $ip);

        $revotes = E2eBallot::where('election_id', $election->id)->where('credential', $credential)->count() - 1;

        return [
            'message' => 'Ballot cast. You can change your vote until the election closes; only your last ballot counts.',
            'receipt' => [
                'tracking_code' => $row->tracking_code,
                'short_code' => $row->short_code,
                'election_id' => $election->id,
                'election_title' => $election->title,
                'manifest_hash' => $manifest->hash,
                'board_position' => $row->id,
                'replaces_previous' => $revotes > 0,
            ],
        ];
    }

    /** Publishes a spoiled (audited) ballot. Deliberately unauthenticated and unlinked to any voter. */
    public function publishAudit(Election $election, array $audit): array
    {
        if (!$election->isE2e() || $election->key_ceremony_status !== 'complete') {
            throw new VotingException('This election does not accept audited ballots.', 'not_e2e');
        }
        $manifest = BallotManifest::where('election_id', $election->id)->find((int) ($audit['manifest_id'] ?? 0));
        if (!$manifest) {
            throw new VotingException('Unknown ballot style.', 'wrong_manifest');
        }

        $check = BallotCrypto::verifyAudit($manifest->toCrypto(), $election->joint_public_key, $audit);
        if (!$check['ok']) {
            throw new VotingException('Audit record is inconsistent: ' . $check['reason'] . '.', 'invalid_audit');
        }

        $tracking = BallotCrypto::trackingHash($election->id, $manifest->hash, $audit['ciphertexts']);
        if (E2eBallot::where('tracking_code', $tracking)->exists()) {
            // An audited ballot must never have been cast — revealing its randomness would reveal a counted vote.
            throw new VotingException('This ballot was already cast and cannot be audited.', 'already_cast');
        }

        $row = AuditedBallot::firstOrCreate(
            ['tracking_code' => $tracking],
            [
                'election_id' => $election->id,
                'manifest_id' => $manifest->id,
                'short_code' => BallotCrypto::shortCode($tracking),
                'ciphertexts' => array_values($audit['ciphertexts']),
                'selections' => array_values($audit['selections']),
                'randomness' => array_values($audit['randomness']),
            ]
        );

        return ['tracking_code' => $row->tracking_code, 'short_code' => $row->short_code, 'status' => 'audited'];
    }
}
