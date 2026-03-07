<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class Election2022Seeder extends Seeder
{
    public function run(): void
    {
        DB::table('elections')->updateOrInsert(
            ['title' => '2022 Lebanese Parliamentary Elections'],
            [
                'type' => 'parliamentary',
                'law_ref' => 'Law 44/2017',
                'description' => 'Recreated structure for the 2022 parliamentary elections.',
                'starts_at' => '2022-05-15 07:00:00',
                'ends_at' => '2022-05-15 19:00:00',
                'status' => 'draft',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );
    }
}