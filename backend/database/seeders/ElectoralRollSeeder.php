<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ElectoralRollSeeder extends Seeder
{
    private function electionId(): int
    {
        $id = DB::table('elections')
            ->where('type', 'parliamentary')
            ->whereDate('starts_at', '2022-05-15')
            ->value('id');

        if (!$id) {
            throw new RuntimeException('Election 2022 not found.');
        }

        return (int) $id;
    }

    private function governorateId(string $code): int
    {
        $id = DB::table('governorates')
            ->where('code', $code)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Missing governorate code {$code}");
        }

        return (int) $id;
    }

    private function districtId(string $code): int
    {
        $id = DB::table('districts')
            ->where('code', $code)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Missing district code {$code}");
        }

        return (int) $id;
    }

    public function run(): void
    {
        $electionId = $this->electionId();

        $rows = [
            [
                'national_id_number' => '2022-000001',
                'first_name' => 'Karim',
                'father_name' => 'Ali',
                'last_name' => 'Hosri',
                'mother_full_name' => 'Maya Nader',
                'date_of_birth' => '1990-04-15',
                'registered_governorate_code' => 'BEIRUT',
                'registered_district_code' => 'BEIRUT',
                'civil_rights_status' => 'full',
                'eligibility_status' => 'eligible',
                'ineligibility_reason' => null,
            ],
            [
                'national_id_number' => '2022-000002',
                'first_name' => 'Mira',
                'father_name' => 'Youssef',
                'last_name' => 'Khoury',
                'mother_full_name' => 'Randa Saliba',
                'date_of_birth' => '1988-09-21',
                'registered_governorate_code' => 'BEKAA',
                'registered_district_code' => 'ZAHLE',
                'civil_rights_status' => 'full',
                'eligibility_status' => 'eligible',
                'ineligibility_reason' => null,
            ],
        ];

        foreach ($rows as $row) {
            DB::table('electoral_roll_entries')->updateOrInsert(
                [
                    'election_id' => $electionId,
                    'national_id_number' => $row['national_id_number'],
                ],
                [
                    'election_id' => $electionId,
                    'first_name' => $row['first_name'],
                    'father_name' => $row['father_name'],
                    'last_name' => $row['last_name'],
                    'mother_full_name' => $row['mother_full_name'],
                    'date_of_birth' => $row['date_of_birth'],
                    'registered_governorate_id' => $this->governorateId($row['registered_governorate_code']),
                    'registered_district_id' => $this->districtId($row['registered_district_code']),
                    'civil_rights_status' => $row['civil_rights_status'],
                    'eligibility_status' => $row['eligibility_status'],
                    'ineligibility_reason' => $row['ineligibility_reason'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}