<?php

namespace Database\Seeders;

use App\Models\Constituency;
use App\Models\RegistryPerson;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use RuntimeException;

class RegistryPeopleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        /*
        |--------------------------------------------------------------------------
        | Resolve constituency IDs from actual seeded constituency codes
        |--------------------------------------------------------------------------
        */
        $constituencies = [
            'beirut_1' => $this->findConstituencyIdByCode('BEIRUT_1'),
            'beirut_2' => $this->findConstituencyIdByCode('BEIRUT_2'),
            'mount_lebanon_1' => $this->findConstituencyIdByCode('MOUNT_LEBANON_1'),
            'mount_lebanon_2' => $this->findConstituencyIdByCode('MOUNT_LEBANON_2'),
            'north_1' => $this->findConstituencyIdByCode('NORTH_1'),
            'north_2' => $this->findConstituencyIdByCode('NORTH_2'),
            'bekaa_1' => $this->findConstituencyIdByCode('BEKAA_1'),
            'south_1' => $this->findConstituencyIdByCode('SOUTH_1'),
        ];

        /*
        |--------------------------------------------------------------------------
        | Fixed records for deterministic testing
        |--------------------------------------------------------------------------
        */
        $fixedRecords = [
            [
                'full_name_en' => 'Karim Nabil Haddad',
                'full_name_ar' => 'كريم نبيل حداد',
                'father_name_en' => 'Nabil',
                'father_name_ar' => 'نبيل',
                'mother_name_en' => 'Mona',
                'mother_name_ar' => 'منى',
                'date_of_birth' => '1997-05-14',
                'gender' => 'male',
                'civil_registry_number' => 'REG-BEI1-000001',
                'governorate' => 'Beirut',
                'district' => 'Beirut I',
                'locality' => 'Achrafieh',
                'polling_center_name' => 'Achrafieh Official Secondary School',
                'polling_station_code' => 'BEI1-PS-001',
                'constituency_id' => $constituencies['beirut_1'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'full_name_en' => 'Maya Elias Khoury',
                'full_name_ar' => 'مايا إلياس خوري',
                'father_name_en' => 'Elias',
                'father_name_ar' => 'إلياس',
                'mother_name_en' => 'Rita',
                'mother_name_ar' => 'ريتا',
                'date_of_birth' => '1993-11-02',
                'gender' => 'female',
                'civil_registry_number' => 'REG-BEI2-000002',
                'governorate' => 'Beirut',
                'district' => 'Beirut II',
                'locality' => 'Mazraa',
                'polling_center_name' => 'Mazraa Public School',
                'polling_station_code' => 'BEI2-PS-002',
                'constituency_id' => $constituencies['beirut_2'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'full_name_en' => 'Ziad Maroun Ghanem',
                'full_name_ar' => 'زياد مارون غانم',
                'father_name_en' => 'Maroun',
                'father_name_ar' => 'مارون',
                'mother_name_en' => 'Hoda',
                'mother_name_ar' => 'هدى',
                'date_of_birth' => '1988-08-21',
                'gender' => 'male',
                'civil_registry_number' => 'REG-ML1-000003',
                'governorate' => 'Mount Lebanon',
                'district' => 'Keserwan',
                'locality' => 'Jounieh',
                'polling_center_name' => 'Jounieh Official School',
                'polling_station_code' => 'ML1-PS-003',
                'constituency_id' => $constituencies['mount_lebanon_1'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'full_name_en' => 'Layal Ahmad Darwish',
                'full_name_ar' => 'ليال أحمد درويش',
                'father_name_en' => 'Ahmad',
                'father_name_ar' => 'أحمد',
                'mother_name_en' => 'Samira',
                'mother_name_ar' => 'سميرة',
                'date_of_birth' => '1990-01-17',
                'gender' => 'female',
                'civil_registry_number' => 'REG-N2-000004',
                'governorate' => 'North',
                'district' => 'Tripoli',
                'locality' => 'Tripoli',
                'polling_center_name' => 'Tripoli Girls Official School',
                'polling_station_code' => 'N2-PS-004',
                'constituency_id' => $constituencies['north_2'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'full_name_en' => 'Ali Hussein Hamdan',
                'full_name_ar' => 'علي حسين حمدان',
                'father_name_en' => 'Hussein',
                'father_name_ar' => 'حسين',
                'mother_name_en' => 'Fatima',
                'mother_name_ar' => 'فاطمة',
                'date_of_birth' => '1985-07-09',
                'gender' => 'male',
                'civil_registry_number' => 'REG-S1-000005',
                'governorate' => 'South',
                'district' => 'Sidon',
                'locality' => 'Sidon',
                'polling_center_name' => 'Sidon Official High School',
                'polling_station_code' => 'S1-PS-005',
                'constituency_id' => $constituencies['south_1'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        RegistryPerson::upsert(
            $fixedRecords,
            ['civil_registry_number'],
            [
                'full_name_en',
                'full_name_ar',
                'father_name_en',
                'father_name_ar',
                'mother_name_en',
                'mother_name_ar',
                'date_of_birth',
                'gender',
                'governorate',
                'district',
                'locality',
                'polling_center_name',
                'polling_station_code',
                'constituency_id',
                'is_eligible',
                'has_voted',
                'updated_at',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Synthetic bulk data
        |--------------------------------------------------------------------------
        */
        $maleFirstNames = [
            'Ahmad', 'Ali', 'Hassan', 'Hussein', 'Karim', 'Nabil', 'Maroun',
            'Georges', 'Elie', 'Charbel', 'Rami', 'Tarek', 'Bilal', 'Mahmoud',
            'Youssef', 'Michel', 'Fadi', 'Nadim', 'Samer', 'Wael'
        ];

        $femaleFirstNames = [
            'Maya', 'Rita', 'Hiba', 'Nour', 'Layal', 'Mona', 'Rana', 'Cynthia',
            'Carla', 'Dima', 'Lynn', 'Samar', 'Rima', 'Nada', 'Yara', 'Lama',
            'Fatima', 'Zeinab', 'Mariam', 'Sally'
        ];

        $lastNames = [
            'Haddad', 'Khoury', 'Ghanem', 'Darwish', 'Hamdan', 'Najjar',
            'Helou', 'Saad', 'Nahas', 'Mansour', 'Karam', 'Moussa',
            'Saliba', 'Abi Akl', 'Younes', 'Farhat', 'Issa', 'Khalil',
            'Hobeika', 'Sfeir', 'Maalouf', 'Rahal', 'Tabet', 'Azar'
        ];

        $motherNames = [
            'Mona', 'Rita', 'Hoda', 'Samira', 'Fatima', 'Mariam', 'Nawal',
            'Hanan', 'Aida', 'Leila', 'Siham', 'Rania', 'Nada', 'Dounia'
        ];

        $locations = [
            [
                'governorate' => 'Beirut',
                'district' => 'Beirut I',
                'localities' => ['Achrafieh', 'Rmeil', 'Saifi'],
                'polling_centers' => [
                    'Achrafieh Official Secondary School',
                    'Rmeil Public School',
                    'Saifi Official School',
                ],
                'prefix' => 'BEI1',
                'constituency_id' => $constituencies['beirut_1'],
            ],
            [
                'governorate' => 'Beirut',
                'district' => 'Beirut II',
                'localities' => ['Mazraa', 'Moussaitbeh', 'Ras Beirut'],
                'polling_centers' => [
                    'Mazraa Public School',
                    'Moussaitbeh Official School',
                    'Ras Beirut Secondary School',
                ],
                'prefix' => 'BEI2',
                'constituency_id' => $constituencies['beirut_2'],
            ],
            [
                'governorate' => 'Mount Lebanon',
                'district' => 'Keserwan',
                'localities' => ['Jounieh', 'Zouk Mikael', 'Adma'],
                'polling_centers' => [
                    'Jounieh Official School',
                    'Zouk Mikael Public School',
                    'Adma Official School',
                ],
                'prefix' => 'ML1',
                'constituency_id' => $constituencies['mount_lebanon_1'],
            ],
            [
                'governorate' => 'Mount Lebanon',
                'district' => 'Metn',
                'localities' => ['Dekweneh', 'Sin El Fil', 'Broummana'],
                'polling_centers' => [
                    'Dekweneh Official School',
                    'Sin El Fil Public School',
                    'Broummana Official School',
                ],
                'prefix' => 'ML2',
                'constituency_id' => $constituencies['mount_lebanon_2'],
            ],
            [
                'governorate' => 'North',
                'district' => 'Akkar',
                'localities' => ['Halba', 'Qobayat', 'Bireh'],
                'polling_centers' => [
                    'Halba Official School',
                    'Qobayat Public School',
                    'Bireh Official School',
                ],
                'prefix' => 'N1',
                'constituency_id' => $constituencies['north_1'],
            ],
            [
                'governorate' => 'North',
                'district' => 'Tripoli',
                'localities' => ['Tripoli', 'Mina', 'Qalamoun'],
                'polling_centers' => [
                    'Tripoli Boys Official School',
                    'Mina Public School',
                    'Qalamoun Official School',
                ],
                'prefix' => 'N2',
                'constituency_id' => $constituencies['north_2'],
            ],
            [
                'governorate' => 'Bekaa',
                'district' => 'Zahle',
                'localities' => ['Zahle', 'Chtaura', 'Qabb Elias'],
                'polling_centers' => [
                    'Zahle Official School',
                    'Chtaura Public School',
                    'Qabb Elias Official School',
                ],
                'prefix' => 'B1',
                'constituency_id' => $constituencies['bekaa_1'],
            ],
            [
                'governorate' => 'South',
                'district' => 'Sidon',
                'localities' => ['Sidon', 'Ghaziyeh', 'Maghdoucheh'],
                'polling_centers' => [
                    'Sidon Official High School',
                    'Ghaziyeh Public School',
                    'Maghdoucheh Official School',
                ],
                'prefix' => 'S1',
                'constituency_id' => $constituencies['south_1'],
            ],
        ];

        $rows = [];
        $target = 240;
        $sequence = 100000;

        for ($i = 0; $i < $target; $i++) {
            $gender = $i % 2 === 0 ? 'male' : 'female';

            $firstName = $gender === 'male'
                ? $maleFirstNames[array_rand($maleFirstNames)]
                : $femaleFirstNames[array_rand($femaleFirstNames)];

            $fatherName = $maleFirstNames[array_rand($maleFirstNames)];
            $motherName = $motherNames[array_rand($motherNames)];
            $lastName = $lastNames[array_rand($lastNames)];

            $location = $locations[array_rand($locations)];
            $locality = $location['localities'][array_rand($location['localities'])];
            $pollingCenter = $location['polling_centers'][array_rand($location['polling_centers'])];

            $dob = Carbon::createFromDate(
                rand(1960, 2003),
                rand(1, 12),
                rand(1, 28)
            )->toDateString();

            $fullNameEn = "{$firstName} {$fatherName} {$lastName}";
            $civilRegistryNumber = sprintf('REG-%s-%06d', $location['prefix'], $sequence++);
            $pollingStationCode = sprintf('%s-PS-%03d', $location['prefix'], rand(1, 40));

            $rows[] = [
                'full_name_en' => $fullNameEn,
                'full_name_ar' => null,
                'father_name_en' => $fatherName,
                'father_name_ar' => null,
                'mother_name_en' => $motherName,
                'mother_name_ar' => null,
                'date_of_birth' => $dob,
                'gender' => $gender,
                'civil_registry_number' => $civilRegistryNumber,
                'governorate' => $location['governorate'],
                'district' => $location['district'],
                'locality' => $locality,
                'polling_center_name' => $pollingCenter,
                'polling_station_code' => $pollingStationCode,
                'constituency_id' => $location['constituency_id'],
                'is_eligible' => true,
                'has_voted' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            RegistryPerson::upsert(
                $chunk,
                ['civil_registry_number'],
                [
                    'full_name_en',
                    'full_name_ar',
                    'father_name_en',
                    'father_name_ar',
                    'mother_name_en',
                    'mother_name_ar',
                    'date_of_birth',
                    'gender',
                    'governorate',
                    'district',
                    'locality',
                    'polling_center_name',
                    'polling_station_code',
                    'constituency_id',
                    'is_eligible',
                    'has_voted',
                    'updated_at',
                ]
            );
        }
    }

    private function findConstituencyIdByCode(string $code): int
    {
        $record = Constituency::where('code', $code)->first();

        if (!$record) {
            throw new RuntimeException("Constituency not found for code: {$code}");
        }

        return $record->id;
    }
}
