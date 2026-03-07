<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConstituencySeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // Beirut
            ['code' => 'BEIRUT_1', 'name_en' => 'Beirut I', 'name_ar' => 'بيروت الأولى'],
            ['code' => 'BEIRUT_2', 'name_en' => 'Beirut II', 'name_ar' => 'بيروت الثانية'],

            // Mount Lebanon
            ['code' => 'MOUNT_LEBANON_1', 'name_en' => 'Keserwan–Jbeil', 'name_ar' => 'كسروان – جبيل'],
            ['code' => 'MOUNT_LEBANON_2', 'name_en' => 'Metn', 'name_ar' => 'المتن'],
            ['code' => 'MOUNT_LEBANON_3', 'name_en' => 'Baabda', 'name_ar' => 'بعبدا'],
            ['code' => 'MOUNT_LEBANON_4', 'name_en' => 'Chouf–Aley', 'name_ar' => 'الشوف – عاليه'],

            // North
            ['code' => 'NORTH_1', 'name_en' => 'Akkar', 'name_ar' => 'عكار'],
            ['code' => 'NORTH_2', 'name_en' => 'Tripoli–Minieh–Dannieh', 'name_ar' => 'طرابلس – المنية – الضنية'],
            ['code' => 'NORTH_3', 'name_en' => 'Zgharta–Bcharre–Koura–Batroun', 'name_ar' => 'زغرتا – بشري – الكورة – البترون'],

            // Bekaa
            ['code' => 'BEKAA_1', 'name_en' => 'Zahle', 'name_ar' => 'زحلة'],
            ['code' => 'BEKAA_2', 'name_en' => 'West Bekaa–Rachaya', 'name_ar' => 'البقاع الغربي – راشيا'],
            ['code' => 'BEKAA_3', 'name_en' => 'Baalbek–Hermel', 'name_ar' => 'بعلبك – الهرمل'],

            // South / Nabatieh
            ['code' => 'SOUTH_1', 'name_en' => 'Saida–Jezzine', 'name_ar' => 'صيدا – جزين'],
            ['code' => 'SOUTH_2', 'name_en' => 'Tyre–Zahrani', 'name_ar' => 'صور – الزهراني'],
            ['code' => 'SOUTH_3', 'name_en' => 'Nabatieh–Bint Jbeil–Marjayoun–Hasbaya', 'name_ar' => 'النبطية – بنت جبيل – مرجعيون – حاصبيا'],
        ];

        foreach ($rows as $r) {
            DB::table('constituencies')->updateOrInsert(
                ['code' => $r['code']],
                [
                    'name_en' => $r['name_en'],
                    'name_ar' => $r['name_ar'],
                    'law_ref' => 'Law 44/2017',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}