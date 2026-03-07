<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfessionSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            // Muslims
            ['code' => 'SUNNI',   'name_ar' => 'سني',   'name_en' => 'Sunni'],
            ['code' => 'SHIA',    'name_ar' => 'شيعي',  'name_en' => 'Shia'],
            ['code' => 'DRUZE',   'name_ar' => 'درزي',  'name_en' => 'Druze'],
            ['code' => 'ALAWITE', 'name_ar' => 'علوي',  'name_en' => 'Alawite'],

            // Christians
            ['code' => 'MARONITE',            'name_ar' => 'ماروني',          'name_en' => 'Maronite'],
            ['code' => 'GREEK_ORTHODOX',      'name_ar' => 'روم أرثوذكس',     'name_en' => 'Greek Orthodox'],
            ['code' => 'GREEK_CATHOLIC',      'name_ar' => 'روم كاثوليك',     'name_en' => 'Greek Catholic'],
            ['code' => 'ARMENIAN_ORTHODOX',   'name_ar' => 'أرمن أرثوذكس',    'name_en' => 'Armenian Orthodox'],
            ['code' => 'ARMENIAN_CATHOLIC',   'name_ar' => 'أرمن كاثوليك',    'name_en' => 'Armenian Catholic'],
            ['code' => 'EVANGELICAL',         'name_ar' => 'إنجيلي',          'name_en' => 'Evangelical'],
            ['code' => 'CHRISTIAN_MINORITIES','name_ar' => 'أقليات مسيحية',   'name_en' => 'Christian Minorities'],
        ];

        foreach ($rows as $r) {
            DB::table('confessions')->updateOrInsert(
                ['code' => $r['code']],
                ['name_ar' => $r['name_ar'], 'name_en' => $r['name_en'], 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}