<?php

namespace Tests\Feature\Admin;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Confession;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;
use App\Services\CandidateSheetExportService;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CandidateSheetExportTest extends AdminTestCase
{
    private Election $election;
    private Constituency $constituency;

    protected function setUp(): void
    {
        parent::setUp();

        $this->election = Election::factory()->create(['title' => 'Test Election', 'status' => 'draft']);
        $this->constituency = Constituency::factory()->create(['name_en' => 'Beirut I', 'code' => 'BEIRUT_1']);
        $this->election->constituencies()->attach($this->constituency->id);

        $confession = Confession::create(['code' => 'MARONITE', 'name_en' => 'Maronite', 'name_ar' => 'ماروني']);

        $list = ElectionList::factory()->create([
            'election_id' => $this->election->id,
            'constituency_id' => $this->constituency->id,
            'list_name' => 'Unity List',
            'list_name_en' => 'Unity List',
            'list_name_ar' => 'لائحة الوحدة',
        ]);

        foreach ([['Jane Example', '0012345', 1], ['John Example', 'LB2', 2]] as [$name, $nid, $position]) {
            $profile = CandidateProfile::factory()->create([
                'full_name' => $name,
                'national_id_number' => $nid,
                'date_of_birth' => '1980-04-27',
            ]);

            $candidacy = Candidacy::factory()->create([
                'election_id' => $this->election->id,
                'candidate_profile_id' => $profile->id,
                'constituency_id' => $this->constituency->id,
                'confession_id' => $confession->id,
                'status' => 'accepted',
            ]);

            ListCandidate::create([
                'list_id' => $list->id,
                'candidacy_id' => $candidacy->id,
                'position_order' => $position,
            ]);
        }
    }

    /** @return array<int, array<int, mixed>> */
    private function sheetRows(string $title = 'Candidates'): array
    {
        $spreadsheet = app(CandidateSheetExportService::class)->build($this->election);

        return $spreadsheet->getSheetByName($title)->toArray(null, true, false, false);
    }

    public function test_export_downloads_as_a_spreadsheet(): void
    {
        $this->loginAsAdmin();

        $response = $this->get("/api/admin/elections/{$this->election->id}/export");

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        $this->assertStringContainsString('test-election-candidates.xlsx', $response->headers->get('content-disposition'));
    }

    public function test_export_writes_one_row_per_candidate_in_the_importer_layout(): void
    {
        $rows = $this->sheetRows();

        $this->assertSame(
            ['constituency', 'list_name_en', 'list_name_ar', 'list_code', 'candidate_name', 'candidate_name_ar',
             'national_id', 'date_of_birth', 'confession', 'district', 'position', 'status'],
            $rows[0]
        );

        $this->assertCount(3, $rows); // header + two candidates

        $this->assertSame('Beirut I', $rows[1][0]);
        $this->assertSame('Unity List', $rows[1][1]);
        $this->assertSame('Jane Example', $rows[1][4]);
        $this->assertSame('1980-04-27', $rows[1][7]);
        $this->assertSame('Maronite', $rows[1][8]);
        $this->assertSame(1, $rows[1][10]);
        $this->assertSame('accepted', $rows[1][11]);
    }

    public function test_national_ids_keep_their_leading_zeroes(): void
    {
        $rows = $this->sheetRows();

        $this->assertSame('0012345', $rows[1][6]);
    }

    public function test_candidates_on_no_list_go_to_their_own_sheet(): void
    {
        $profile = CandidateProfile::factory()->create(['full_name' => 'Orphan Candidate']);

        Candidacy::factory()->create([
            'election_id' => $this->election->id,
            'candidate_profile_id' => $profile->id,
            'constituency_id' => $this->constituency->id,
            'status' => 'pending',
        ]);

        $rows = $this->sheetRows('Unassigned candidates');

        $this->assertCount(2, $rows);
        $this->assertSame('Orphan Candidate', $rows[1][1]);

        // The importable sheet still holds only the two list members.
        $this->assertCount(3, $this->sheetRows());
    }

    public function test_an_export_can_be_imported_into_another_election(): void
    {
        // The point of matching the importer's layout: cloning a roster.
        $this->loginAsAdmin();

        $spreadsheet = app(CandidateSheetExportService::class)->build($this->election);
        $path = tempnam(sys_get_temp_dir(), 'export') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $target = Election::factory()->create(['title' => 'Cloned Election', 'status' => 'draft']);

        $response = $this->post("/api/admin/elections/{$target->id}/import", [
            'file' => new UploadedFile($path, 'roster.xlsx', null, null, true),
        ]);

        $response->assertOk();
        $response->assertJsonPath('imported.rows_processed', 2);
        $response->assertJsonPath('imported.lists_created', 1);
        // The candidate profiles already exist, so only the candidacies are new.
        $response->assertJsonPath('imported.candidate_profiles_created', 0);
        $response->assertJsonPath('imported.candidacies_created', 2);
        $response->assertJsonPath('imported.constituencies_attached', 1);

        $this->assertSame(1, ElectionList::where('election_id', $target->id)->count());
        $this->assertSame(2, Candidacy::where('election_id', $target->id)->count());
    }

    public function test_export_is_admin_only(): void
    {
        $this->get("/api/admin/elections/{$this->election->id}/export")->assertStatus(401);
    }
}
