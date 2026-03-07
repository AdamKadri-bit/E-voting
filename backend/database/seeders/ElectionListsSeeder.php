<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class ElectionListsSeeder extends Seeder
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

    private function constituencyId(string $code): int
    {
        $id = DB::table('constituencies')
            ->where('code', $code)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Missing constituency {$code}");
        }

        return (int) $id;
    }

    private function makeListCode(int $electionId, int $constituencyId, string $nameEn): string
    {
        $base = Str::slug($nameEn, '_');

        if ($base === '') {
            $base = 'list';
        }

        $code = strtoupper($electionId . '_' . $constituencyId . '_' . $base);

        return strlen($code) > 160 ? substr($code, 0, 160) : $code;
    }

    public function run(): void
    {
        $electionId = $this->electionId();

        $lists = [

            'BEIRUT_1' => [
                ['en' => 'Beirut, Nahno Laha', 'ar' => 'بيروت نحن لها'],
                ['en' => 'Lubnan Al Siyada', 'ar' => 'لبنان السيادة'],
                ['en' => 'Kenaa w Rah Nebaa', 'ar' => 'كنا ورح نبقى'],
                ['en' => 'LiWatani', 'ar' => 'لوطني'],
                ['en' => 'Qadreen', 'ar' => 'قادرين'],
                ['en' => 'Beirut Madinati', 'ar' => 'بيروت مدينتي'],
            ],

            'BEIRUT_2' => [
                ['en' => 'Unity of Beirut', 'ar' => 'وحدة بيروت'],
                ['en' => 'Beirut Confronts', 'ar' => 'بيروت تواجه'],
                ['en' => 'For Beirut', 'ar' => 'لبيروت'],
                ['en' => 'To Preserve Beirut', 'ar' => 'لتبقى بيروت'],
            ],

            'MOUNT_LEBANON_1' => [
                ['en' => 'The Heart of Independent Lebanon', 'ar' => 'قلب لبنان المستقل'],
            ],

            'MOUNT_LEBANON_2' => [
                ['en' => 'Together Stronger', 'ar' => 'معاً أقوى'],
            ],

            'MOUNT_LEBANON_3' => [
                ['en' => 'Baabda Uprises', 'ar' => 'بعبدا تنتفض'],
            ],

            'MOUNT_LEBANON_4' => [
                ['en' => 'Partnership and Will', 'ar' => 'الشراكة والإرادة'],
                ['en' => 'United for Change', 'ar' => 'متحدون للتغيير'],
                ['en' => 'Mountain List', 'ar' => 'لائحة الجبل'],
                ['en' => "Nation's Sovereignty", 'ar' => 'سيادة الأمة'],
                ['en' => 'Your Voice is Revolution', 'ar' => 'صوتك ثورة'],
            ],

            'NORTH_1' => [
                ['en' => 'National Moderation', 'ar' => 'الاعتدال الوطني'],
                ['en' => 'Akkar First', 'ar' => 'عكار أولاً'],
                ['en' => 'Akkar the Change', 'ar' => 'عكار التغيير'],
                ['en' => 'Loyalty to Akkar', 'ar' => 'الوفاء لعكار'],
                ['en' => 'Towards Citizenship', 'ar' => 'نحو المواطنة'],
            ],

            'NORTH_2' => [
                ['en' => 'Real Change', 'ar' => 'التغيير الحقيقي'],
                ['en' => 'For the People', 'ar' => 'للناس'],
                ['en' => 'Uprise for Sovereignty for Justice', 'ar' => 'انهض للسيادة للعدالة'],
                ['en' => 'Third Republic', 'ar' => 'الجمهورية الثالثة'],
            ],

            'NORTH_3' => [
                ['en' => 'Strong Republic Pulse', 'ar' => 'نبض الجمهورية القوية'],
                ['en' => 'We are staying here', 'ar' => 'باقون هنا'],
                ['en' => 'Our North', 'ar' => 'شمالنا'],
                ['en' => 'Shamalouna', 'ar' => 'شمالنا'],
                ['en' => 'Taqaddom', 'ar' => 'تقدّم'],
            ],

            'BEKAA_1' => [
                ['en' => 'Independent Sovereignists', 'ar' => 'السياديون المستقلون'],
                ['en' => 'Zahle Uprises', 'ar' => 'زحلة تنتفض'],
            ],

            'BEKAA_2' => [
                ['en' => 'Our Bekaa First', 'ar' => 'بقاعنا أولاً'],
            ],

            'BEKAA_3' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Coalition for Change', 'ar' => 'ائتلاف التغيير'],
                ['en' => 'Independents against Corruption', 'ar' => 'مستقلون ضد الفساد'],
                ['en' => 'We are Able', 'ar' => 'قادرين'],
            ],

            'SOUTH_1' => [
                ['en' => 'Our Unity in Saida and Jezzine', 'ar' => 'وحدتنا في صيدا وجزين'],
                ['en' => 'We are the Change', 'ar' => 'نحن التغيير'],
            ],

            'SOUTH_2' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Embracing State', 'ar' => 'الدولة تحتضن'],
                ['en' => 'The Free Decision', 'ar' => 'القرار الحر'],
            ],

            'SOUTH_3' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],
            ],
        ];

        foreach ($lists as $constituencyCode => $rows) {
            $constituencyId = $this->constituencyId($constituencyCode);

            foreach ($rows as $row) {
                $listCode = $this->makeListCode(
                    $electionId,
                    $constituencyId,
                    $row['en']
                );

                DB::table('lists')->updateOrInsert(
                    [
                        'election_id' => $electionId,
                        'constituency_id' => $constituencyId,
                        'list_code' => $listCode,
                    ],
                    [
                        'list_name' => $row['en'],
                        'list_name_en' => $row['en'],
                        'list_name_ar' => $row['ar'],
                        'is_withdrawn' => false,
                        'source_ref' => '2022-verified-partial-dev-seed',
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }
}