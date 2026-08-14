<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Election>
 */
class ElectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => 'parliamentary',
            'law_ref' => 'Law 44/2017',
            'title' => fake()->unique()->sentence(3),
            'description' => fake()->sentence(),
            // The schema requires a window; tests that need a "no window yet"
            // election null these out explicitly.
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDays(2),
            'status' => 'draft',
        ];
    }

    public function withWindow(?\DateTimeInterface $start = null, ?\DateTimeInterface $end = null): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => $start ?? now()->subHours(2),
            'ends_at' => $end ?? now()->addHours(2),
        ]);
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'active']);
    }

    public function closed(): static
    {
        return $this->state(fn (array $attributes) => ['status' => 'closed']);
    }
}
