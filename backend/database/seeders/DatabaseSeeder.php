<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

       $this->call([
        \Database\Seeders\ConfessionSeeder::class,
        \Database\Seeders\GovernorateSeeder::class,
        \Database\Seeders\DistrictSeeder::class,
        \Database\Seeders\ConstituencySeeder::class,
        \Database\Seeders\ConstituencyDistrictSeeder::class,
        \Database\Seeders\Election2022Seeder::class,
        \Database\Seeders\ElectionListsSeeder::class,
    ]);
    }
}
