<?php

namespace App\Services\E2e;

use App\Models\Election;
use App\Models\ElectionParticipation;
use App\Models\User;
use App\Models\Voter;
use App\Models\VoterElectionStatus;
use App\Services\Geo\GeoIpResolver;
use App\Services\VoterStatusService;

/**
 * Records that a voter took part, and where from. The request IP is resolved to
 * a country offline and then dropped — it is never written anywhere. Only the
 * first ballot creates a row, and its time is rounded down to the hour, so the
 * participation list can't be lined up against ballot order.
 */
class ParticipationService
{
    public function __construct(
        private GeoIpResolver $geoIp,
        private VoterStatusService $status,
    ) {
    }

    public function record(Election $election, Voter $voter, User $user, ?string $ip): ElectionParticipation
    {
        $existing = ElectionParticipation::where('election_id', $election->id)->where('voter_id', $voter->id)->first();
        if ($existing) {
            return $existing;
        }

        $declared = $this->status->declaredCountry($user);
        $detected = $this->geoIp->countryFor($ip);
        $hour = now()->startOfHour();

        $row = ElectionParticipation::create([
            'election_id' => $election->id,
            'voter_id' => $voter->id,
            'voter_type' => $user->voter_type,
            'declared_country' => $declared,
            'ip_country' => $detected,
            // Admin review only; a mismatch never blocks a vote (VPNs, travel).
            'location_mismatch' => $detected !== null && $detected !== $declared,
            'coarse_timestamp' => $hour,
        ]);

        // Keep the legacy turnout counters working, with the same coarse time.
        VoterElectionStatus::updateOrCreate(
            ['voter_id' => $voter->id, 'election_id' => $election->id],
            ['has_voted' => true, 'voted_at' => $hour]
        );

        return $row;
    }
}
