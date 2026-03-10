<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ListCandidatesSeeder extends Seeder
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

    private function normalizeListName(string $constituencyCode, string $name): string
    {
        $name = trim($name);

        return match ([$constituencyCode, $name]) {

            // Beirut I
            ['BEIRUT_1', 'Capable'] => 'Qadreen',
            ['BEIRUT_1', 'Li Watani'] => 'LiWatani',
            ['BEIRUT_1', 'Sovereign Lebanon (Kataeb)'] => 'Lubnan Al Siyada',
            ['BEIRUT_1', 'We Are for Beirut (LF)'] => 'Beirut, Nahno Laha',
            ['BEIRUT_1', 'We Were & Will Remain in Beirut (FPM)'] => 'Kenaa w Rah Nebaa',

            // Beirut II
            ['BEIRUT_2', 'Beirut Confronts (Seniora & PSP)'] => 'Beirut Confronts',
            ['BEIRUT_2', 'Beirut Needs a Heart (Makhzoumi)'] => 'For Beirut',
            ['BEIRUT_2', 'Beirut the Change'] => 'To Preserve Beirut',
            ['BEIRUT_2', 'Beirut United (FPM & Hezbollah)'] => 'Unity of Beirut',
            ['BEIRUT_2', 'Capable'] => 'To Preserve Beirut',
            ['BEIRUT_2', 'So Beirut Stays'] => 'To Preserve Beirut',
            ['BEIRUT_2', 'This is Beirut'] => 'Beirut Confronts',
            ['BEIRUT_2', 'To Beirut'] => 'For Beirut',
            ['BEIRUT_2', 'Yes to Beirut'] => 'To Preserve Beirut',

            // North I
            ['NORTH_1', 'Akkar Revolts'] => 'Akkar the Change',
            ['NORTH_1', 'Awakening for Akkar'] => 'Akkar the Change',
            ['NORTH_1', 'The List of Akkar (LF)'] => 'National Moderation',
            ['NORTH_1', 'Towards Citizenship (Communists)'] => 'Towards Citizenship',

            // North II
            ['NORTH_2', 'Ambition of the Youth'] => 'Real Change',
            ['NORTH_2', 'Capable'] => 'Real Change',
            ['NORTH_2', 'Dawn of Change'] => 'Real Change',
            ['NORTH_2', 'For the People (PSP)'] => 'For the People',
            ['NORTH_2', 'Lebanon Is Ours'] => 'For the People',
            ['NORTH_2', 'Rescue of a Nation (Rifi & LF)'] => 'Uprise for Sovereignty for Justice',
            ['NORTH_2', 'Revolt for Justice and Sovereignty'] => 'Uprise for Sovereignty for Justice',
            ['NORTH_2', 'Stability and Development'] => 'For the People',
            ['NORTH_2', 'The People’s Will'] => 'Real Change',
            ['NORTH_2', 'The Real Change'] => 'Real Change',
            ['NORTH_2', 'The Third Republic'] => 'Third Republic',

            // North III
            ['NORTH_3', 'Awaken Your Voice'] => 'Taqaddom',
            ['NORTH_3', 'The North of Confrontation (Kataeb)'] => 'Strong Republic Pulse',
            ['NORTH_3', 'The Pulse of the Strong Republic (LF)'] => 'Strong Republic Pulse',
            ['NORTH_3', 'Unity of the North (Marada)'] => 'Our North',
            ['NORTH_3', 'We Can Change (Communists)'] => 'Taqaddom',
            ['NORTH_3', 'We Will Stay Here (FPM)'] => 'We are staying here',

            // Bekaa I
            ['BEKAA_1', 'Capable of Confrontation'] => 'Independent Sovereignists',
            ['BEKAA_1', 'Change'] => 'Zahle Uprises',
            ['BEKAA_1', 'Independent Sovereignists (Kataeb)'] => 'Independent Sovereignists',
            ['BEKAA_1', 'Speech and Action'] => 'Independent Sovereignists',
            ['BEKAA_1', 'The Popular Bloc'] => 'Independent Sovereignists',
            ['BEKAA_1', 'Zahle Revolts'] => 'Zahle Uprises',
            ['BEKAA_1', 'Zahle the Message (FPM & Hezbollah)'] => 'Independent Sovereignists',
            ['BEKAA_1', 'Zahle the Sovereign (LF)'] => 'Independent Sovereignists',

            // Bekaa II
            ['BEKAA_2', 'A Better Tomorrow (Etihad & FPM)'] => 'Our Bekaa First',
            ['BEKAA_2', 'Capable'] => 'Our Bekaa First',
            ['BEKAA_2', 'Sahlouna Wal Jabal'] => 'Our Bekaa First',
            ['BEKAA_2', 'The National Decision (PSP)'] => 'Our Bekaa First',
            ['BEKAA_2', 'Towards Change (Kataeb)'] => 'Our Bekaa First',

            // Bekaa III
            ['BEKAA_3', 'Building the State (LF)'] => 'Coalition for Change',
            ['BEKAA_3', 'Capable'] => 'We are Able',
            ['BEKAA_3', 'Hope and Loyalty (Amal & Hezbollah)'] => 'Hope and Loyalty',
            ['BEKAA_3', 'Independents Against Corruption'] => 'Independents against Corruption',
            ['BEKAA_3', 'The Coalition for Change'] => 'Coalition for Change',
            ['BEKAA_3', 'Tribes and Families for Development'] => 'We are Able',

            // Mount Lebanon I
            ['MOUNT_LEBANON_1', 'Capable'] => 'The Heart of Independent Lebanon',
            ['MOUNT_LEBANON_1', 'Freedom is a Choice'] => 'The Heart of Independent Lebanon',
            ['MOUNT_LEBANON_1', 'The Cry of a Nation (Kataeb)'] => 'The Heart of Independent Lebanon',
            ['MOUNT_LEBANON_1', 'We Are the Change'] => 'The Heart of Independent Lebanon',
            ['MOUNT_LEBANON_1', 'We Were and Will Remain (FPM & Hezbollah)'] => 'The Heart of Independent Lebanon',
            ['MOUNT_LEBANON_1', 'With You, We Can Until the End'] => 'The Heart of Independent Lebanon',

            // Mount Lebanon II
            ['MOUNT_LEBANON_2', 'Metn the Change (Kataeb)'] => 'Together Stronger',
            ['MOUNT_LEBANON_2', 'Sovereigntists of the Metn'] => 'Together Stronger',
            ['MOUNT_LEBANON_2', 'The Free Metn (LF)'] => 'Together Stronger',
            ['MOUNT_LEBANON_2', 'Together We Are Stronger'] => 'Together Stronger',
            ['MOUNT_LEBANON_2', 'Towards the State'] => 'Together Stronger',
            ['MOUNT_LEBANON_2', 'We Were and Will Remain for Metn (FPM)'] => 'Together Stronger',

            // Mount Lebanon III
            ['MOUNT_LEBANON_3', 'Baabda Revolts (Kataeb)'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'Baabda Sovereignty and Decision (LF & PSP)'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'Baabda the Change'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'Capable'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'The National Accord List (Amal & FPM)'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'Together We Can'] => 'Baabda Uprises',
            ['MOUNT_LEBANON_3', 'We are the Change'] => 'Baabda Uprises',

            // Mount Lebanon IV
            ['MOUNT_LEBANON_4', 'Capable'] => 'United for Change',
            ['MOUNT_LEBANON_4', 'Partnership and Will (LF & PSP)'] => 'Partnership and Will',
            ['MOUNT_LEBANON_4', 'Sovereignty of a Nation'] => "Nation's Sovereignty",
            ['MOUNT_LEBANON_4', 'The Mountain'] => 'Mountain List',
            ['MOUNT_LEBANON_4', 'The Mountain Revolts'] => 'United for Change',
            ['MOUNT_LEBANON_4', 'United for Change (Communists)'] => 'United for Change',
            ['MOUNT_LEBANON_4', 'Your Vote is a Revolution'] => 'Your Voice is Revolution',

            // South I
            ['SOUTH_1', 'Capable'] => 'We are the Change',
            ['SOUTH_1', 'Moderation Is our Strength (Amal)'] => 'Our Unity in Saida and Jezzine',
            ['SOUTH_1', 'Our Unity in Saida and Jezzine'] => 'Our Unity in Saida and Jezzine',
            ['SOUTH_1', 'The Voice of Change'] => 'We are the Change',
            ['SOUTH_1', 'Together for Saida and Jezzine (FPM)'] => 'Our Unity in Saida and Jezzine',
            ['SOUTH_1', 'We Are the Change (Kataeb)'] => 'We are the Change',

            // South II
            ['SOUTH_2', 'Hope and Loyalty (Amal & Hezbollah)'] => 'Hope and Loyalty',
            ['SOUTH_2', 'The Free Decision (LF & Communists)'] => 'The Free Decision',
            ['SOUTH_2', 'The Inclusive State'] => 'Embracing State',
            ['SOUTH_2', 'Together for Change (Communists)'] => 'Embracing State',

            // South III
            ['SOUTH_3', 'Hope and Loyalty (Amal & Hezbollah)'] => 'Hope and Loyalty',
            ['SOUTH_3', 'Together Towards Change (Communists)'] => 'Hope and Loyalty',
            ['SOUTH_3', 'Voice of the South'] => 'Hope and Loyalty',

            default => $name,
        };
    }

    private function listId(int $electionId, int $constituencyId, string $constituencyCode, string $listNameEn): int
    {
        $normalizedName = $this->normalizeListName($constituencyCode, $listNameEn);

        $id = DB::table('lists')
            ->where('election_id', $electionId)
            ->where('constituency_id', $constituencyId)
            ->where('list_name_en', $normalizedName)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("List not found: {$constituencyCode} / {$listNameEn} -> {$normalizedName}");
        }

        return (int) $id;
    }

    private function candidacyId(int $electionId, int $candidateProfileId, int $constituencyId): int
    {
        $id = DB::table('candidacies')
            ->where('election_id', $electionId)
            ->where('candidate_profile_id', $candidateProfileId)
            ->where('constituency_id', $constituencyId)
            ->value('id');

        if (!$id) {
            throw new RuntimeException("Candidacy not found for candidate_profile_id {$candidateProfileId}");
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
            $listId = $this->listId(
                $electionId,
                $constituencyId,
                $row['constituency_code'],
                $row['list_name_en']
            );
            $candidacyId = $this->candidacyId($electionId, $candidateProfileId, $constituencyId);

            DB::table('list_candidates')->updateOrInsert(
                [
                    'list_id' => $listId,
                    'candidacy_id' => $candidacyId,
                ],
                [
                    'position_order' => $row['position_order'] ?? null,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}