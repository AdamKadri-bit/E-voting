<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CandidateProfile>
 */
class CandidateProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'national_id_number' => fake()->unique()->numerify('LB##########'),
            'full_name' => fake()->name(),
            'full_name_ar' => fake()->name(),
            'date_of_birth' => fake()->date('Y-m-d', '-25 years'),
            'civil_rights_status' => 'full',
        ];
    }
}
