<?php

namespace Database\Factories;

use App\Models\CandidateProfile;
use App\Models\Constituency;
use App\Models\Election;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Candidacy>
 */
class CandidacyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'election_id' => Election::factory(),
            'candidate_profile_id' => CandidateProfile::factory(),
            'constituency_id' => Constituency::factory(),
            'status' => 'accepted',
        ];
    }
}
