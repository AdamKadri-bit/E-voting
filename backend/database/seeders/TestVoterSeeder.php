<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Voter;
use App\Models\Election;
use App\Models\VoterElectionStatus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TestVoterSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure the demo voter account exists so a fresh clone can seed and log in
        // without a manual signup step. Login: edwin@gmail.com / Password123!
        $user = User::firstOrCreate(
            ['email' => 'edwin@gmail.com'],
            [
                'name' => 'Edwin Hosri',
                'password' => Hash::make('Password123!'),
                'role' => 'voter',
                'verification_status' => 'account_created',
                'can_vote' => true,
            ]
        );

        // Email verification is required before login; mark the demo account verified.
        if (!$user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $election = Election::first();

        if (!$election) {
            throw new \RuntimeException('No election found.');
        }

        $district = DB::table('districts')->first();

        if (!$district) {
            throw new \RuntimeException('No districts seeded.');
        }

        $nationalId = '999999999';

        $voter = Voter::updateOrCreate(
            ['user_id' => $user->id],
            [
                'national_id_number' => $nationalId,
                'first_name' => 'Edwin',
                'father_name' => 'Test',
                'last_name' => 'Hosri',
                'mother_full_name' => 'Test Mother',
                'date_of_birth' => '1999-01-01',
                'place_of_birth' => 'Lebanon',
                'registered_governorate_id' => $district->governorate_id,
                'registered_district_id' => $district->id,
                'current_residence_text' => 'Lebanon',
                'ineligibility_reason' => null,
            ]
        );

        DB::table('electoral_roll_entries')->updateOrInsert(
            [
                'election_id' => $election->id,
                'national_id_number' => $nationalId,
            ],
            [
                'first_name' => 'Edwin',
                'father_name' => 'Test',
                'last_name' => 'Hosri',
                'mother_full_name' => 'Test Mother',
                'date_of_birth' => '1999-01-01',
                'registered_governorate_id' => $district->governorate_id,
                'registered_district_id' => $district->id,
                'ineligibility_reason' => null,
            ]
        );

        VoterElectionStatus::updateOrCreate(
            [
                'voter_id' => $voter->id,
                'election_id' => $election->id,
            ],
            [
                'has_voted' => false,
                'voted_at' => null,
            ]
        );
    }
}