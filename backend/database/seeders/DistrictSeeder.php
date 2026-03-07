<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DistrictSeeder extends Seeder
{
    private function govId(string $code): int
    {
        $id = DB::table('governorates')->where('code', $code)->value('id');
        if (!$id) throw new RuntimeException("Missing governorates.code = {$code}. Seed governorates first.");
        return (int) $id;
    }

    public function run(): void
    {
        $gov = [
            'BEIRUT' => $this->govId('BEIRUT'),
            'MOUNT_LEBANON' => $this->govId('MOUNT_LEBANON'),
            'NORTH' => $this->govId('NORTH'),
            'AKKAR_GOV' => $this->govId('AKKAR'),
            'BEKAA' => $this->govId('BEKAA'),
            'BAALBEK_HERMEL' => $this->govId('BAALBEK_HERMEL'),
            'SOUTH' => $this->govId('SOUTH'),
            'NABATIEH' => $this->govId('NABATIEH'),
        ];

        $districts = [
            // Beirut governorate
            ['code'=>'BEIRUT','name_en'=>'Beirut','name_ar'=>'بيروت','governorate_id'=>$gov['BEIRUT']],

            // Akkar governorate
            ['code'=>'AKKAR','name_en'=>'Akkar','name_ar'=>'عكار','governorate_id'=>$gov['AKKAR_GOV']],

            // North governorate
            ['code'=>'TRIPOLI','name_en'=>'Tripoli','name_ar'=>'طرابلس','governorate_id'=>$gov['NORTH']],
            ['code'=>'MINIEH','name_en'=>'Minieh','name_ar'=>'المنية','governorate_id'=>$gov['NORTH']],
            ['code'=>'DANNIEH','name_en'=>'Dannieh','name_ar'=>'الضنية','governorate_id'=>$gov['NORTH']],
            ['code'=>'ZGHARTA','name_en'=>'Zgharta','name_ar'=>'زغرتا','governorate_id'=>$gov['NORTH']],
            ['code'=>'BCHARRE','name_en'=>'Bcharre','name_ar'=>'بشري','governorate_id'=>$gov['NORTH']],
            ['code'=>'KOURA','name_en'=>'Koura','name_ar'=>'الكورة','governorate_id'=>$gov['NORTH']],
            ['code'=>'BATROUN','name_en'=>'Batroun','name_ar'=>'البترون','governorate_id'=>$gov['NORTH']],

            // Mount Lebanon governorate
            ['code'=>'KESERWAN','name_en'=>'Keserwan','name_ar'=>'كسروان','governorate_id'=>$gov['MOUNT_LEBANON']],
            ['code'=>'JBEIL','name_en'=>'Jbeil','name_ar'=>'جبيل','governorate_id'=>$gov['MOUNT_LEBANON']],
            ['code'=>'MATN','name_en'=>'Metn','name_ar'=>'المتن','governorate_id'=>$gov['MOUNT_LEBANON']],
            ['code'=>'BAABDA','name_en'=>'Baabda','name_ar'=>'بعبدا','governorate_id'=>$gov['MOUNT_LEBANON']],
            ['code'=>'CHOUF','name_en'=>'Chouf','name_ar'=>'الشوف','governorate_id'=>$gov['MOUNT_LEBANON']],
            ['code'=>'ALEY','name_en'=>'Aley','name_ar'=>'عاليه','governorate_id'=>$gov['MOUNT_LEBANON']],

            // Bekaa governorate
            ['code'=>'ZAHLE','name_en'=>'Zahle','name_ar'=>'زحلة','governorate_id'=>$gov['BEKAA']],
            ['code'=>'WEST_BEKAA','name_en'=>'West Bekaa','name_ar'=>'البقاع الغربي','governorate_id'=>$gov['BEKAA']],
            ['code'=>'RACHAYA','name_en'=>'Rachaya','name_ar'=>'راشيا','governorate_id'=>$gov['BEKAA']],

            // Baalbek-Hermel governorate
            ['code'=>'BAALBEK','name_en'=>'Baalbek','name_ar'=>'بعلبك','governorate_id'=>$gov['BAALBEK_HERMEL']],
            ['code'=>'HERMEL','name_en'=>'Hermel','name_ar'=>'الهرمل','governorate_id'=>$gov['BAALBEK_HERMEL']],

            // South governorate
            ['code'=>'SAIDA','name_en'=>'Saida','name_ar'=>'صيدا','governorate_id'=>$gov['SOUTH']],
            ['code'=>'JEZZINE','name_en'=>'Jezzine','name_ar'=>'جزين','governorate_id'=>$gov['SOUTH']],
            ['code'=>'TYRE','name_en'=>'Tyre','name_ar'=>'صور','governorate_id'=>$gov['SOUTH']],
            ['code'=>'ZAHRANI','name_en'=>'Zahrani','name_ar'=>'الزهراني','governorate_id'=>$gov['SOUTH']],

            // Nabatieh governorate
            ['code'=>'NABATIEH','name_en'=>'Nabatieh','name_ar'=>'النبطية','governorate_id'=>$gov['NABATIEH']],
            ['code'=>'BINT_JBEIL','name_en'=>'Bint Jbeil','name_ar'=>'بنت جبيل','governorate_id'=>$gov['NABATIEH']],
            ['code'=>'MARJAYOUN','name_en'=>'Marjayoun','name_ar'=>'مرجعيون','governorate_id'=>$gov['NABATIEH']],
            ['code'=>'HASBAYA','name_en'=>'Hasbaya','name_ar'=>'حاصبيا','governorate_id'=>$gov['NABATIEH']],
        ];

        foreach ($districts as $d) {
            DB::table('districts')->updateOrInsert(
                ['code' => $d['code']],
                [
                    'governorate_id' => $d['governorate_id'],
                    'name_en' => $d['name_en'],
                    'name_ar' => $d['name_ar'],
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}