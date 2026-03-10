<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CandidateProfilesSeeder extends Seeder
{
    public function run(): void
    {
        $rows = require database_path('data/candidates_2022.php');

        foreach ($rows as $row) {
            DB::table('candidate_profiles')->updateOrInsert(
                [
                    'national_id_number' => $row['national_id_number'],
                ],
                [
                    'full_name' => $row['full_name'],
                    'full_name_ar' => $row['full_name_ar'] ?? null,
                    'date_of_birth' => $row['date_of_birth'] ?? '1970-01-01',
                    'civil_rights_status' => $row['civil_rights_status'] ?? 'full',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}