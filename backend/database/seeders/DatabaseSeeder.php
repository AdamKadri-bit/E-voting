<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            \Database\Seeders\ConfessionSeeder::class,
            \Database\Seeders\GovernorateSeeder::class,
            \Database\Seeders\DistrictSeeder::class,
            \Database\Seeders\ConstituencySeeder::class,
            \Database\Seeders\ConstituencyDistrictSeeder::class,

            \Database\Seeders\Election2022Seeder::class,
            \Database\Seeders\ElectionConstituenciesSeeder::class,
            \Database\Seeders\ElectionSeatsSeeder::class,
            \Database\Seeders\ElectoralRollSeeder::class,

            \Database\Seeders\ElectionListsSeeder::class,

            \Database\Seeders\CandidateProfilesSeeder::class,
            \Database\Seeders\CandidaciesSeeder::class,
            \Database\Seeders\ListCandidatesSeeder::class,
        ]);
    }
}