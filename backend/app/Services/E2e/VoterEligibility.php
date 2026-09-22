<?php

namespace App\Services\E2e;

use App\Exceptions\VotingException;
use App\Models\Constituency;
use App\Models\District;
use App\Models\Election;
use App\Models\User;
use App\Models\Voter;

/**
 * Everything that has to be true before a voter may see or cast an encrypted
 * ballot, in one place, shared by the resident and diaspora paths — so the two
 * flows cannot drift apart or be used to vote twice.
 */
class VoterEligibility
{
    /**
     * @return array{voter: Voter, district: District, constituency: Constituency}
     */
    public function resolve(User $user, Election $election, bool $requireOpen = true): array
    {
        $voter = $user->voter;
        if (!$voter) {
            throw new VotingException('This account has no voter profile yet.', 'no_voter_profile', 403);
        }

        if ($user->voter_type === null) {
            throw new VotingException('Tell us whether you vote as a resident or from the diaspora first.', 'status_required', 428);
        }

        if (!$election->isE2e()) {
            throw new VotingException('This election used the previous ballot system and no longer accepts ballots.', 'legacy_election', 410);
        }

        if ($requireOpen) {
            if ($election->status !== 'active') {
                throw new VotingException('Election is not active.', 'not_active');
            }
            if (now()->lt($election->starts_at) || now()->gt($election->ends_at)) {
                throw new VotingException('Election is outside its voting window.', 'outside_window');
            }
        }

        if ($election->key_ceremony_status !== 'complete' || !$election->joint_public_key) {
            throw new VotingException('The election key has not been generated yet.', 'keys_not_ready', 409);
        }

        if ($user->voter_type === 'diaspora' && !$election->diaspora_voting_enabled) {
            throw new VotingException(
                'Diaspora voting is not available for this election. Voters living abroad cannot cast a ballot online for it.',
                'diaspora_disabled',
                403
            );
        }

        $onRoll = $election->electoralRollEntries()
            ->where('national_id_number', $voter->national_id_number)
            ->exists();
        if (!$onRoll) {
            throw new VotingException('Voter not found in electoral roll.', 'not_on_roll', 403);
        }

        $district = $voter->district;
        if (!$district) {
            throw new VotingException('Voter district not found.', 'no_district');
        }

        // A district can sit in two constituencies (Beirut); pick the one this election covers.
        $electionConstituencies = $election->constituencies()->pluck('constituencies.id');
        $constituency = $district->constituencies()
            ->whereIn('constituencies.id', $electionConstituencies)
            ->orderBy('constituencies.id')
            ->first();
        if (!$constituency) {
            throw new VotingException('Constituency not part of this election.', 'no_constituency');
        }

        return ['voter' => $voter, 'district' => $district, 'constituency' => $constituency];
    }
}
