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

                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Li Watani', 'ar' => 'لوطني'],
                ['en' => 'Sovereign Lebanon (Kataeb)', 'ar' => 'لبنان السيادة'],
                ['en' => 'We Are for Beirut (LF)', 'ar' => 'بيروت نحن لها'],
                ['en' => 'We Were & Will Remain in Beirut (FPM)', 'ar' => 'كنا ورح نبقى'],
            ],

            'BEIRUT_2' => [
                ['en' => 'Unity of Beirut', 'ar' => 'وحدة بيروت'],
                ['en' => 'Beirut Confronts', 'ar' => 'بيروت تواجه'],
                ['en' => 'For Beirut', 'ar' => 'لبيروت'],
                ['en' => 'To Preserve Beirut', 'ar' => 'لتبقى بيروت'],
                ['en' => 'Beirut Madinati', 'ar' => 'بيروت مدينتي'],

                ['en' => 'Beirut Confronts (Seniora & PSP)', 'ar' => 'بيروت تواجه'],
                ['en' => 'Beirut Needs a Heart (Makhzoumi)', 'ar' => 'بيروت بحاجة إلى قلب'],
                ['en' => 'Beirut the Change', 'ar' => 'بيروت التغيير'],
                ['en' => 'Beirut United (FPM & Hezbollah)', 'ar' => 'بيروت الموحدة'],
                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'So Beirut Stays', 'ar' => 'هكذا تبقى بيروت'],
                ['en' => 'This is Beirut', 'ar' => 'هذه بيروت'],
                ['en' => 'To Beirut', 'ar' => 'إلى بيروت'],
                ['en' => 'Yes to Beirut', 'ar' => 'نعم لبيروت'],
            ],

            'MOUNT_LEBANON_1' => [
                ['en' => 'The Heart of Independent Lebanon', 'ar' => 'قلب لبنان المستقل'],

                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Freedom is a Choice', 'ar' => 'الحرية خيار'],
                ['en' => 'The Cry of a Nation (Kataeb)', 'ar' => 'صرخة وطن'],
                ['en' => 'We Are the Change', 'ar' => 'نحن التغيير'],
                ['en' => 'We Were and Will Remain (FPM & Hezbollah)', 'ar' => 'كنا وسنبقى'],
                ['en' => 'With You, We Can Until the End', 'ar' => 'معكم نكمل إلى النهاية'],
            ],

            'MOUNT_LEBANON_2' => [
                ['en' => 'Together Stronger', 'ar' => 'معاً أقوى'],

                ['en' => 'Metn the Change (Kataeb)', 'ar' => 'المتن التغيير'],
                ['en' => 'Sovereigntists of the Metn', 'ar' => 'سياديّو المتن'],
                ['en' => 'The Free Metn (LF)', 'ar' => 'المتن الحر'],
                ['en' => 'Together We Are Stronger', 'ar' => 'معاً نحن أقوى'],
                ['en' => 'Towards the State', 'ar' => 'نحو الدولة'],
                ['en' => 'We Were and Will Remain for Metn (FPM)', 'ar' => 'كنا وسنبقى للمتن'],
            ],

            'MOUNT_LEBANON_3' => [
                ['en' => 'Baabda Uprises', 'ar' => 'بعبدا تنتفض'],

                ['en' => 'Baabda Revolts (Kataeb)', 'ar' => 'بعبدا تنتفض'],
                ['en' => 'Baabda Sovereignty and Decision (LF & PSP)', 'ar' => 'بعبدا السيادة والقرار'],
                ['en' => 'Baabda the Change', 'ar' => 'بعبدا التغيير'],
                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'The National Accord List (Amal & FPM)', 'ar' => 'لائحة الوفاق الوطني'],
                ['en' => 'Together We Can', 'ar' => 'معاً نستطيع'],
                ['en' => 'We are the Change', 'ar' => 'نحن التغيير'],
            ],

            'MOUNT_LEBANON_4' => [
                ['en' => 'Partnership and Will', 'ar' => 'الشراكة والإرادة'],
                ['en' => 'United for Change', 'ar' => 'متحدون للتغيير'],
                ['en' => 'Mountain List', 'ar' => 'لائحة الجبل'],
                ['en' => "Nation's Sovereignty", 'ar' => 'سيادة الأمة'],
                ['en' => 'Your Voice is Revolution', 'ar' => 'صوتك ثورة'],

                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Partnership and Will (LF & PSP)', 'ar' => 'الشراكة والإرادة'],
                ['en' => 'Sovereignty of a Nation', 'ar' => 'سيادة أمة'],
                ['en' => 'The Mountain', 'ar' => 'الجبل'],
                ['en' => 'The Mountain Revolts', 'ar' => 'الجبل ينتفض'],
                ['en' => 'United for Change (Communists)', 'ar' => 'متحدون للتغيير'],
                ['en' => 'Your Vote is a Revolution', 'ar' => 'صوتك ثورة'],
            ],

            'NORTH_1' => [
                ['en' => 'National Moderation', 'ar' => 'الاعتدال الوطني'],
                ['en' => 'Akkar First', 'ar' => 'عكار أولاً'],
                ['en' => 'Akkar the Change', 'ar' => 'عكار التغيير'],
                ['en' => 'Loyalty to Akkar', 'ar' => 'الوفاء لعكار'],
                ['en' => 'Towards Citizenship', 'ar' => 'نحو المواطنة'],

                ['en' => 'Akkar First (FPM)', 'ar' => 'عكار أولاً'],
                ['en' => 'Akkar Revolts', 'ar' => 'عكار تنتفض'],
                ['en' => 'Awakening for Akkar', 'ar' => 'صحوة لعكار'],
                ['en' => 'The List of Akkar (LF)', 'ar' => 'لائحة عكار'],
                ['en' => 'Towards Citizenship (Communists)', 'ar' => 'نحو المواطنة'],
            ],

            'NORTH_2' => [
                ['en' => 'Real Change', 'ar' => 'التغيير الحقيقي'],
                ['en' => 'For the People', 'ar' => 'للناس'],
                ['en' => 'Uprise for Sovereignty for Justice', 'ar' => 'انهض للسيادة للعدالة'],
                ['en' => 'Third Republic', 'ar' => 'الجمهورية الثالثة'],

                ['en' => 'Ambition of the Youth', 'ar' => 'طموح الشباب'],
                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Dawn of Change', 'ar' => 'فجر التغيير'],
                ['en' => 'For the People (PSP)', 'ar' => 'للناس'],
                ['en' => 'Lebanon Is Ours', 'ar' => 'لبنان لنا'],
                ['en' => 'Rescue of a Nation (Rifi & LF)', 'ar' => 'إنقاذ وطن'],
                ['en' => 'Revolt for Justice and Sovereignty', 'ar' => 'ثورة للعدالة والسيادة'],
                ['en' => 'Stability and Development', 'ar' => 'الاستقرار والتنمية'],
                ['en' => 'The People’s Will', 'ar' => 'إرادة الشعب'],
                ['en' => 'The Real Change', 'ar' => 'التغيير الحقيقي'],
                ['en' => 'The Third Republic', 'ar' => 'الجمهورية الثالثة'],
            ],

            'NORTH_3' => [
                ['en' => 'Strong Republic Pulse', 'ar' => 'نبض الجمهورية القوية'],
                ['en' => 'We are staying here', 'ar' => 'باقون هنا'],
                ['en' => 'Our North', 'ar' => 'شمالنا'],
                ['en' => 'Shamalouna', 'ar' => 'شمالنا'],
                ['en' => 'Taqaddom', 'ar' => 'تقدّم'],

                ['en' => 'Awaken Your Voice', 'ar' => 'أيقظ صوتك'],
                ['en' => 'The North of Confrontation (Kataeb)', 'ar' => 'شمال المواجهة'],
                ['en' => 'The Pulse of the Strong Republic (LF)', 'ar' => 'نبض الجمهورية القوية'],
                ['en' => 'Unity of the North (Marada)', 'ar' => 'وحدة الشمال'],
                ['en' => 'We Can Change (Communists)', 'ar' => 'يمكننا التغيير'],
                ['en' => 'We Will Stay Here (FPM)', 'ar' => 'سنبقى هنا'],
            ],

            'BEKAA_1' => [
                ['en' => 'Independent Sovereignists', 'ar' => 'السياديون المستقلون'],
                ['en' => 'Zahle Uprises', 'ar' => 'زحلة تنتفض'],

                ['en' => 'Capable of Confrontation', 'ar' => 'قادرون على المواجهة'],
                ['en' => 'Change', 'ar' => 'التغيير'],
                ['en' => 'Independent Sovereignists (Kataeb)', 'ar' => 'السياديون المستقلون'],
                ['en' => 'Speech and Action', 'ar' => 'قول وفعل'],
                ['en' => 'The Popular Bloc', 'ar' => 'الكتلة الشعبية'],
                ['en' => 'Zahle Revolts', 'ar' => 'زحلة تنتفض'],
                ['en' => 'Zahle the Message (FPM & Hezbollah)', 'ar' => 'زحلة الرسالة'],
                ['en' => 'Zahle the Sovereign (LF)', 'ar' => 'زحلة السيادية'],
            ],

            'BEKAA_2' => [
                ['en' => 'Our Bekaa First', 'ar' => 'بقاعنا أولاً'],
                ['en' => 'Our Bekaa First (LF)', 'ar' => 'بقاعنا أولاً'],

                ['en' => 'A Better Tomorrow (Etihad & FPM)', 'ar' => 'غد أفضل'],
                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Sahlouna Wal Jabal', 'ar' => 'سهلنا والجبل'],
                ['en' => 'The National Decision (PSP)', 'ar' => 'القرار الوطني'],
                ['en' => 'Towards Change (Kataeb)', 'ar' => 'نحو التغيير'],
            ],

            'BEKAA_3' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Coalition for Change', 'ar' => 'ائتلاف التغيير'],
                ['en' => 'Independents against Corruption', 'ar' => 'مستقلون ضد الفساد'],
                ['en' => 'We are Able', 'ar' => 'قادرين'],

                ['en' => 'Building the State (LF)', 'ar' => 'بناء الدولة'],
                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Hope and Loyalty (Amal & Hezbollah)', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Independents Against Corruption', 'ar' => 'مستقلون ضد الفساد'],
                ['en' => 'The Coalition for Change', 'ar' => 'ائتلاف التغيير'],
                ['en' => 'Tribes and Families for Development', 'ar' => 'العشائر والعائلات للتنمية'],
            ],

            'SOUTH_1' => [
                ['en' => 'Our Unity in Saida and Jezzine', 'ar' => 'وحدتنا في صيدا وجزين'],
                ['en' => 'We are the Change', 'ar' => 'نحن التغيير'],

                ['en' => 'Capable', 'ar' => 'قادرين'],
                ['en' => 'Moderation Is our Strength (Amal)', 'ar' => 'الاعتدال قوتنا'],
                ['en' => 'The Voice of Change', 'ar' => 'صوت التغيير'],
                ['en' => 'Together for Saida and Jezzine (FPM)', 'ar' => 'معاً لصيدا وجزين'],
                ['en' => 'We Are the Change (Kataeb)', 'ar' => 'نحن التغيير'],
            ],

            'SOUTH_2' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Embracing State', 'ar' => 'الدولة تحتضن'],
                ['en' => 'The Free Decision', 'ar' => 'القرار الحر'],

                ['en' => 'Hope and Loyalty (Amal & Hezbollah)', 'ar' => 'الأمل والوفاء'],
                ['en' => 'The Free Decision (LF & Communists)', 'ar' => 'القرار الحر'],
                ['en' => 'The Inclusive State', 'ar' => 'الدولة الجامعة'],
                ['en' => 'Together for Change (Communists)', 'ar' => 'معاً للتغيير'],
            ],

            'SOUTH_3' => [
                ['en' => 'Hope and Loyalty', 'ar' => 'الأمل والوفاء'],

                ['en' => 'Hope and Loyalty (Amal & Hezbollah)', 'ar' => 'الأمل والوفاء'],
                ['en' => 'Together Towards Change (Communists)', 'ar' => 'معاً نحو التغيير'],
                ['en' => 'Voice of the South', 'ar' => 'صوت الجنوب'],
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
                        'source_ref' => '2022-expanded-dev-seed',
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }
}