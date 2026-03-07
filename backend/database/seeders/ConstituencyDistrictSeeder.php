<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ConstituencyDistrictSeeder extends Seeder
{
    private function idByCode(string $table, string $code): int
    {
        $id = DB::table($table)->where('code', $code)->value('id');
        if (!$id) {
            throw new RuntimeException("Missing {$table}.code = {$code}. Seed that first.");
        }
        return (int) $id;
    }

    public function run(): void
    {
        // Constituency => [district codes]
        $map = [
            'BEIRUT_1' => ['BEIRUT'],
            'BEIRUT_2' => ['BEIRUT'],

            'MOUNT_LEBANON_1' => ['KESERWAN', 'JBEIL'],
            'MOUNT_LEBANON_2' => ['MATN'],
            'MOUNT_LEBANON_3' => ['BAABDA'],
            'MOUNT_LEBANON_4' => ['CHOUF', 'ALEY'],

            'NORTH_1' => ['AKKAR'],
            'NORTH_2' => ['TRIPOLI', 'MINIEH', 'DANNIEH'],
            'NORTH_3' => ['ZGHARTA', 'BCHARRE', 'KOURA', 'BATROUN'],

            'BEKAA_1' => ['ZAHLE'],
            'BEKAA_2' => ['WEST_BEKAA', 'RACHAYA'],
            'BEKAA_3' => ['BAALBEK', 'HERMEL'],

            'SOUTH_1' => ['SAIDA', 'JEZZINE'],
            'SOUTH_2' => ['TYRE', 'ZAHRANI'],
            'SOUTH_3' => ['NABATIEH', 'BINT_JBEIL', 'MARJAYOUN', 'HASBAYA'],
        ];

        foreach ($map as $constituencyCode => $districtCodes) {
            $constituencyId = $this->idByCode('constituencies', $constituencyCode);

            foreach ($districtCodes as $districtCode) {
                $districtId = $this->idByCode('districts', $districtCode);

                DB::table('constituency_districts')->updateOrInsert(
                    [
                        'constituency_id' => $constituencyId,
                        'district_id' => $districtId,
                    ],
                    [
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }
}