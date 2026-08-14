<?php

namespace Database\Factories;

use App\Models\Constituency;
use App\Models\Election;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EncryptedBallot>
 */
class EncryptedBallotFactory extends Factory
{
    public function definition(): array
    {
        return [
            'election_id' => Election::factory(),
            'constituency_id' => Constituency::factory(),
            // Content is irrelevant to timeline/turnout tests, which only
            // ever read `cast_at` — never decrypt the payload.
            'encrypted_payload' => 'not-a-real-payload',
            'payload_hash' => hash('sha256', fake()->unique()->uuid()),
            'receipt_hash' => hash('sha256', fake()->unique()->uuid()),
            'cast_at' => now(),
        ];
    }
}
