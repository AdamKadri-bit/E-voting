<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ElectionSeatsSeeder extends Seeder
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

    private function districtId(string $code): int
    {
        $id = DB::table('districts')->where('code', $code)->value('id');

        if (!$id) {
            throw new RuntimeException("Missing districts.code = {$code}. Seed that first.");
        }

        return (int) $id;
    }

    private function confessionId(string $code): int
    {
        $id = DB::table('confessions')->where('code', $code)->value('id');

        if (!$id) {
            throw new RuntimeException("Missing confessions.code = {$code}. Seed that first.");
        }

        return (int) $id;
    }

    private function constituencyId(string $code): int
    {
        $id = DB::table('constituencies')->where('code', $code)->value('id');

        if (!$id) {
            throw new RuntimeException("Missing constituencies.code = {$code}. Seed that first.");
        }

        return (int) $id;
    }

    public function run(): void
    {
        $electionId = $this->electionId();

        $rows = [
            // BEIRUT_1 (8)
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'MARONITE', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'ARMENIAN_ORTHODOX', 'seat_count' => 3],
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'ARMENIAN_CATHOLIC', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_1', 'district_code' => 'BEIRUT', 'confession_code' => 'CHRISTIAN_MINORITIES', 'seat_count' => 1],

            // BEIRUT_2 (11)
            ['constituency_code' => 'BEIRUT_2', 'district_code' => 'BEIRUT', 'confession_code' => 'SUNNI', 'seat_count' => 6],
            ['constituency_code' => 'BEIRUT_2', 'district_code' => 'BEIRUT', 'confession_code' => 'SHIA', 'seat_count' => 2],
            ['constituency_code' => 'BEIRUT_2', 'district_code' => 'BEIRUT', 'confession_code' => 'DRUZE', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_2', 'district_code' => 'BEIRUT', 'confession_code' => 'EVANGELICAL', 'seat_count' => 1],
            ['constituency_code' => 'BEIRUT_2', 'district_code' => 'BEIRUT', 'confession_code' => 'ARMENIAN_ORTHODOX', 'seat_count' => 1],

            // MOUNT_LEBANON_1 (8)
            ['constituency_code' => 'MOUNT_LEBANON_1', 'district_code' => 'KESERWAN', 'confession_code' => 'MARONITE', 'seat_count' => 5],
            ['constituency_code' => 'MOUNT_LEBANON_1', 'district_code' => 'JBEIL', 'confession_code' => 'MARONITE', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_1', 'district_code' => 'JBEIL', 'confession_code' => 'SHIA', 'seat_count' => 1],

            // MOUNT_LEBANON_2 (8)
            ['constituency_code' => 'MOUNT_LEBANON_2', 'district_code' => 'MATN', 'confession_code' => 'MARONITE', 'seat_count' => 4],
            ['constituency_code' => 'MOUNT_LEBANON_2', 'district_code' => 'MATN', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_2', 'district_code' => 'MATN', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],
            ['constituency_code' => 'MOUNT_LEBANON_2', 'district_code' => 'MATN', 'confession_code' => 'ARMENIAN_ORTHODOX', 'seat_count' => 1],

            // MOUNT_LEBANON_3 (6)
            ['constituency_code' => 'MOUNT_LEBANON_3', 'district_code' => 'BAABDA', 'confession_code' => 'MARONITE', 'seat_count' => 3],
            ['constituency_code' => 'MOUNT_LEBANON_3', 'district_code' => 'BAABDA', 'confession_code' => 'SHIA', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_3', 'district_code' => 'BAABDA', 'confession_code' => 'DRUZE', 'seat_count' => 1],

            // MOUNT_LEBANON_4 (13)
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'ALEY', 'confession_code' => 'DRUZE', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'ALEY', 'confession_code' => 'MARONITE', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'ALEY', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'CHOUF', 'confession_code' => 'DRUZE', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'CHOUF', 'confession_code' => 'SUNNI', 'seat_count' => 2],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'CHOUF', 'confession_code' => 'MARONITE', 'seat_count' => 3],
            ['constituency_code' => 'MOUNT_LEBANON_4', 'district_code' => 'CHOUF', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],

            // NORTH_1 (7)
            ['constituency_code' => 'NORTH_1', 'district_code' => 'AKKAR', 'confession_code' => 'SUNNI', 'seat_count' => 3],
            ['constituency_code' => 'NORTH_1', 'district_code' => 'AKKAR', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 2],
            ['constituency_code' => 'NORTH_1', 'district_code' => 'AKKAR', 'confession_code' => 'MARONITE', 'seat_count' => 1],
            ['constituency_code' => 'NORTH_1', 'district_code' => 'AKKAR', 'confession_code' => 'ALAWITE', 'seat_count' => 1],

            // NORTH_2 (11)
            ['constituency_code' => 'NORTH_2', 'district_code' => 'TRIPOLI', 'confession_code' => 'SUNNI', 'seat_count' => 5],
            ['constituency_code' => 'NORTH_2', 'district_code' => 'TRIPOLI', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'NORTH_2', 'district_code' => 'TRIPOLI', 'confession_code' => 'MARONITE', 'seat_count' => 1],
            ['constituency_code' => 'NORTH_2', 'district_code' => 'TRIPOLI', 'confession_code' => 'ALAWITE', 'seat_count' => 1],
            ['constituency_code' => 'NORTH_2', 'district_code' => 'MINIEH', 'confession_code' => 'SUNNI', 'seat_count' => 1],
            ['constituency_code' => 'NORTH_2', 'district_code' => 'DANNIEH', 'confession_code' => 'SUNNI', 'seat_count' => 2],

            // NORTH_3 (10)
            ['constituency_code' => 'NORTH_3', 'district_code' => 'BATROUN', 'confession_code' => 'MARONITE', 'seat_count' => 2],
            ['constituency_code' => 'NORTH_3', 'district_code' => 'BCHARRE', 'confession_code' => 'MARONITE', 'seat_count' => 2],
            ['constituency_code' => 'NORTH_3', 'district_code' => 'ZGHARTA', 'confession_code' => 'MARONITE', 'seat_count' => 3],
            ['constituency_code' => 'NORTH_3', 'district_code' => 'KOURA', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 3],

            // BEKAA_1 (7)
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 2],
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'MARONITE', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'ARMENIAN_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'SHIA', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_1', 'district_code' => 'ZAHLE', 'confession_code' => 'SUNNI', 'seat_count' => 1],

            // BEKAA_2 (6)
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'WEST_BEKAA', 'confession_code' => 'SUNNI', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'WEST_BEKAA', 'confession_code' => 'SHIA', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'WEST_BEKAA', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'RACHAYA', 'confession_code' => 'SUNNI', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'RACHAYA', 'confession_code' => 'DRUZE', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_2', 'district_code' => 'RACHAYA', 'confession_code' => 'MARONITE', 'seat_count' => 1],

            // BEKAA_3 (10)
            ['constituency_code' => 'BEKAA_3', 'district_code' => 'BAALBEK', 'confession_code' => 'SHIA', 'seat_count' => 4],
            ['constituency_code' => 'BEKAA_3', 'district_code' => 'BAALBEK', 'confession_code' => 'SUNNI', 'seat_count' => 2],
            ['constituency_code' => 'BEKAA_3', 'district_code' => 'BAALBEK', 'confession_code' => 'MARONITE', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_3', 'district_code' => 'BAALBEK', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],
            ['constituency_code' => 'BEKAA_3', 'district_code' => 'HERMEL', 'confession_code' => 'SHIA', 'seat_count' => 2],

            // SOUTH_1 (5)
            ['constituency_code' => 'SOUTH_1', 'district_code' => 'SAIDA', 'confession_code' => 'SUNNI', 'seat_count' => 2],
            ['constituency_code' => 'SOUTH_1', 'district_code' => 'JEZZINE', 'confession_code' => 'MARONITE', 'seat_count' => 2],
            ['constituency_code' => 'SOUTH_1', 'district_code' => 'JEZZINE', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],

            // SOUTH_2 (7)
            ['constituency_code' => 'SOUTH_2', 'district_code' => 'TYRE', 'confession_code' => 'SHIA', 'seat_count' => 4],
            ['constituency_code' => 'SOUTH_2', 'district_code' => 'ZAHRANI', 'confession_code' => 'SHIA', 'seat_count' => 2],
            ['constituency_code' => 'SOUTH_2', 'district_code' => 'ZAHRANI', 'confession_code' => 'GREEK_CATHOLIC', 'seat_count' => 1],

            // SOUTH_3 (11)
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'NABATIEH', 'confession_code' => 'SHIA', 'seat_count' => 3],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'BINT_JBEIL', 'confession_code' => 'SHIA', 'seat_count' => 3],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'MARJAYOUN', 'confession_code' => 'SHIA', 'seat_count' => 1],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'MARJAYOUN', 'confession_code' => 'GREEK_ORTHODOX', 'seat_count' => 1],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'HASBAYA', 'confession_code' => 'SHIA', 'seat_count' => 1],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'HASBAYA', 'confession_code' => 'SUNNI', 'seat_count' => 1],
            ['constituency_code' => 'SOUTH_3', 'district_code' => 'HASBAYA', 'confession_code' => 'DRUZE', 'seat_count' => 1],
        ];

        foreach ($rows as $row) {
            DB::table('election_seats')->updateOrInsert(
                [
                    'election_id' => $electionId,
                    'constituency_id' => $this->constituencyId($row['constituency_code']),
                    'district_id' => $this->districtId($row['district_code']),
                    'confession_id' => $this->confessionId($row['confession_code']),
                ],
                [
                    'seat_count' => $row['seat_count'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}