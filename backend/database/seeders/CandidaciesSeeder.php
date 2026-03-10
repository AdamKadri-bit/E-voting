<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class CandidaciesSeeder extends Seeder
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

    private function candidateProfileId(string $nationalId): int
    {
        $id = DB::table('candidate_profiles')
            ->where('national_id_number', $nationalId)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Candidate profile not found: {$nationalId}");
        }

        return (int) $id;
    }

    private function constituencyId(string $code): int
    {
        $id = DB::table('constituencies')
            ->where('code', $code)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Constituency not found: {$code}");
        }

        return (int) $id;
    }

    private function districtId(string $code): int
    {
        $id = DB::table('districts')
            ->where('code', $code)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("District not found: {$code}");
        }

        return (int) $id;
    }

    private function normalizeConfessionName(string $value): string
    {
        $value = trim($value);

        return match ($value) {
            'Greek Othodox' => 'Greek Orthodox',
            'Minorities' => 'Christian Minorities',
            default => $value,
        };
    }

    private function confessionId(string $nameEn): int
    {
        $normalized = $this->normalizeConfessionName($nameEn);

        $id = DB::table('confessions')
            ->where('name_en', $normalized)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Confession not found: {$normalized}");
        }

        return (int) $id;
    }

    public function run(): void
    {
        $rows = require database_path('data/candidates_2022.php');
        $electionId = $this->electionId();

        foreach ($rows as $row) {
            $candidateProfileId = $this->candidateProfileId($row['national_id_number']);
            $constituencyId = $this->constituencyId($row['constituency_code']);
            $districtId = $this->districtId($row['district_code']);
            $confessionId = $this->confessionId($row['confession_name_en']);

            DB::table('candidacies')->updateOrInsert(
                [
                    'election_id' => $electionId,
                    'candidate_profile_id' => $candidateProfileId,
                    'constituency_id' => $constituencyId,
                ],
                [
                    'district_id' => $districtId,
                    'confession_id' => $confessionId,
                    'status' => 'accepted',
                    'rejection_reason' => null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}