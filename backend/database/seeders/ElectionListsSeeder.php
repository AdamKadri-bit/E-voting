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
            throw new RuntimeException('Election 2022 not found. Check elections table row values.');
        }

        return (int) $id;
    }

    private function constituencyId(string $code): int
    {
        $id = DB::table('constituencies')->where('code', $code)->value('id');

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

        // keep within column limit (160)
        return strlen($code) > 160 ? substr($code, 0, 160) : $code;
    }

    public function run(): void
    {
        $election = $this->electionId();

        /**
         * Structure:
         * 'CONSTITUENCY_CODE' => [
         *   ['en' => '...', 'ar' => '...'],
         *   ...
         * ]
         *
         * If you don't have Arabic yet, set 'ar' => null.
         */
        $lists = [
            'BEIRUT_1' => [
                ['en' => 'Loubnan Al Seyada',     'ar' => null],
                ['en' => 'Kenna W Rah Nebaa',     'ar' => null],
                ['en' => 'Beirut, Nahno Laha',    'ar' => null],
                ['en' => 'Liwatani',              'ar' => null],
                ['en' => 'Kadreen',               'ar' => null],
                ['en' => 'Beirut Madinati',       'ar' => null],
            ],

            'BEIRUT_2' => [
                ['en' => 'Beirut Al Taghyeer',    'ar' => null],
                ['en' => 'Beirut Badda Alb',      'ar' => null],
                ['en' => 'Haidi Beirut',          'ar' => null],
                ['en' => 'Beirut Touwajeh',       'ar' => null],
                ['en' => 'Wehdat Beirut',         'ar' => null],
                ['en' => 'Libeirut',              'ar' => null],
                ['en' => 'Litabka Beirut',        'ar' => null],
                ['en' => 'Kadreen',               'ar' => null],
                ['en' => 'Naam LiBeirut',         'ar' => null],
            ],

            'BEKAA_1' => [
                ['en' => 'Seyadeyoon Moustakeloon', 'ar' => null],
                ['en' => 'Zahle Al Seyada',         'ar' => null],
                ['en' => 'Zahle Tantafid',          'ar' => null],
                ['en' => 'Al Kaul Wa Al Fehl',      'ar' => null],
                ['en' => 'Zahle Al Risala',         'ar' => null],
            ],
        ];

        foreach ($lists as $constCode => $listRows) {
            $constId = $this->constituencyId($constCode);

            foreach ($listRows as $row) {
                $en = trim((string)($row['en'] ?? ''));
                if ($en === '') {
                    continue;
                }

                $ar = $row['ar'] ?? null;
                $listCode = $this->makeListCode($election, $constId, $en);

                DB::table('lists')->updateOrInsert(
                    [
                        'election_id' => $election,
                        'constituency_id' => $constId,
                        'list_code' => $listCode,
                    ],
                    [
                        // keep legacy column populated for any existing code
                        'list_name' => $en,

                        'list_name_en' => $en,
                        'list_name_ar' => $ar,
                        'is_withdrawn' => false,
                        'source_ref' => '2022',
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }
}