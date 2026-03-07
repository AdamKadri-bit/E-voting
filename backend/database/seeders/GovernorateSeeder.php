<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GovernorateSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['code' => 'BEIRUT', 'name_en' => 'Beirut', 'name_ar' => 'بيروت'],

            ['code' => 'MOUNT_LEBANON', 'name_en' => 'Mount Lebanon', 'name_ar' => 'جبل لبنان'],
            ['code' => 'NORTH', 'name_en' => 'North', 'name_ar' => 'الشمال'],
            ['code' => 'AKKAR', 'name_en' => 'Akkar', 'name_ar' => 'عكار'],
            ['code' => 'BEKAA', 'name_en' => 'Bekaa', 'name_ar' => 'البقاع'],
            ['code' => 'BAALBEK_HERMEL', 'name_en' => 'Baalbek-Hermel', 'name_ar' => 'بعلبك الهرمل'],
            ['code' => 'SOUTH', 'name_en' => 'South', 'name_ar' => 'الجنوب'],
            ['code' => 'NABATIEH', 'name_en' => 'Nabatieh', 'name_ar' => 'النبطية'],
        ];

        foreach ($rows as $r) {
            DB::table('governorates')->updateOrInsert(
                ['code' => $r['code']],
                [
                    'name_en' => $r['name_en'],
                    'name_ar' => $r['name_ar'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}