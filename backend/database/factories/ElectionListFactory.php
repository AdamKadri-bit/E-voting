<?php

namespace Database\Factories;

use App\Models\Constituency;
use App\Models\Election;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ElectionList>
 */
class ElectionListFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'election_id' => Election::factory(),
            'constituency_id' => Constituency::factory(),
            'list_name' => $name,
            'list_name_en' => $name,
            'list_name_ar' => $name,
            'list_code' => strtoupper(fake()->unique()->bothify('LIST-###')),
            'is_withdrawn' => false,
        ];
    }
}
