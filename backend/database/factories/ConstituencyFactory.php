<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Constituency>
 */
class ConstituencyFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('CST-###')),
            'name_en' => fake()->city(),
            'name_ar' => fake()->city(),
            'law_ref' => 'Law 44/2017',
        ];
    }
}
