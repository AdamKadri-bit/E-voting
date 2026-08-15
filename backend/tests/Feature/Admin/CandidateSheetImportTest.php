<?php

namespace Tests\Feature\Admin;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Confession;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class CandidateSheetImportTest extends AdminTestCase
{
    private Election $election;

    protected function setUp(): void
    {
        parent::setUp();

        $this->election = Election::factory()->create(['status' => 'draft']);
        Constituency::factory()->create(['name_en' => 'Beirut I', 'code' => 'BEIRUT_1']);
        Confession::create(['code' => 'MARONITE', 'name_en' => 'Maronite', 'name_ar' => 'ماروني']);
    }

    /** Writes a CSV upload with the given header row and data rows. */
    private function csv(array $header, array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'import') . '.csv';
        $handle = fopen($path, 'w');
        fputcsv($handle, $header);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);

        return new UploadedFile($path, 'candidates.csv', 'text/csv', null, true);
    }

    private function standardCsv(array $rows): UploadedFile
    {
        return $this->csv(
            ['constituency', 'list_name_en', 'candidate_name', 'national_id', 'date_of_birth', 'confession', 'position'],
            $rows
        );
    }

    public function test_preview_reports_the_plan_without_writing(): void
    {
        $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
            ['Beirut I', 'Unity List', 'John Example', 'LB2', '1975-01-02', 'Maronite', 2],
        ]);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import/preview", ['file' => $file]);

        $response->assertOk();
        $response->assertJsonPath('valid_rows', 2);
        $response->assertJsonPath('invalid_rows', 0);
        $response->assertJsonPath('plan.lists', 1);
        $response->assertJsonPath('plan.candidates', 2);
        $response->assertJsonPath('plan.constituencies_to_attach', 1);

        $this->assertSame(0, ElectionList::count());
        $this->assertSame(0, CandidateProfile::count());
    }

    public function test_import_creates_lists_candidates_and_membership(): void
    {
        $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
            ['Beirut I', 'Unity List', 'John Example', 'LB2', '1975-01-02', 'Maronite', 2],
            ['Beirut I', 'Reform List', 'Sara Example', 'LB3', '1990-06-15', '', ''],
        ]);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file]);

        $response->assertOk();
        $response->assertJsonPath('imported.lists_created', 2);
        $response->assertJsonPath('imported.candidate_profiles_created', 3);
        $response->assertJsonPath('imported.candidacies_created', 3);
        $response->assertJsonPath('imported.memberships_created', 3);
        $response->assertJsonPath('imported.constituencies_attached', 1);

        $this->assertSame(2, ElectionList::where('election_id', $this->election->id)->count());
        $this->assertSame(3, ListCandidate::count());
        $this->assertSame(1, $this->election->constituencies()->count());

        // Candidacies default to accepted so the list is ballot-ready.
        $this->assertSame(3, Candidacy::where('status', 'accepted')->count());

        $unity = ElectionList::where('list_name_en', 'Unity List')->first();
        $this->assertSame(
            [1, 2],
            ListCandidate::where('list_id', $unity->id)->orderBy('position_order')->pluck('position_order')->all()
        );
    }

    public function test_import_reads_a_real_xlsx_file(): void
    {
        $this->loginAsAdmin();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray([
            ['constituency', 'list_name_en', 'candidate_name', 'national_id', 'date_of_birth'],
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27'],
        ]);

        $path = tempnam(sys_get_temp_dir(), 'import') . '.xlsx';
        (new Xlsx($spreadsheet))->save($path);

        $file = new UploadedFile($path, 'candidates.xlsx', null, null, true);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file]);

        $response->assertOk();
        $response->assertJsonPath('imported.rows_processed', 1);
        $this->assertDatabaseHas('candidate_profiles', ['national_id_number' => 'LB1', 'full_name' => 'Jane Example']);
    }

    public function test_a_single_bad_row_blocks_the_whole_file(): void
    {
        $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
            ['Atlantis', 'Unity List', 'John Example', 'LB2', '1975-01-02', 'Maronite', 2],
        ]);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file]);

        $response->assertStatus(422);
        $response->assertJsonPath('preview.invalid_rows', 1);

        $this->assertSame(0, ElectionList::count());
        $this->assertSame(0, CandidateProfile::count());
    }

    public function test_missing_required_column_is_reported(): void
    {
        $this->loginAsAdmin();

        $file = $this->csv(
            ['constituency', 'list_name_en', 'candidate_name'],
            [['Beirut I', 'Unity List', 'Jane Example']]
        );

        $response = $this->post("/api/admin/elections/{$this->election->id}/import/preview", ['file' => $file]);

        $response->assertOk();
        $this->assertStringContainsString('national_id', $response->json('errors.0'));
        $this->assertStringContainsString('date_of_birth', $response->json('errors.0'));
    }

    public function test_repeating_a_candidate_on_one_list_is_rejected(): void
    {
        $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 2],
        ]);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import/preview", ['file' => $file]);

        $response->assertOk();
        $response->assertJsonPath('invalid_rows', 1);
    }

    public function test_national_id_belonging_to_a_different_name_is_rejected(): void
    {
        $this->loginAsAdmin();

        CandidateProfile::factory()->create([
            'national_id_number' => 'LB1',
            'full_name' => 'Someone Else',
        ]);

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
        ]);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import/preview", ['file' => $file]);

        $response->assertOk();
        $response->assertJsonPath('invalid_rows', 1);
        $this->assertStringContainsString('Someone Else', $response->json('rows.0.errors.0'));
    }

    public function test_reimporting_the_same_sheet_creates_nothing_new(): void
    {
        $this->loginAsAdmin();

        $rows = [['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1]];

        $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $this->standardCsv($rows)])
            ->assertOk();

        $response = $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $this->standardCsv($rows)]);

        $response->assertOk();
        $response->assertJsonPath('imported.lists_created', 0);
        $response->assertJsonPath('imported.candidate_profiles_created', 0);
        $response->assertJsonPath('imported.memberships_created', 0);

        $this->assertSame(1, ListCandidate::count());
    }

    public function test_the_same_constituency_and_list_written_differently_is_one_list(): void
    {
        // Sheets in the wild mix the constituency's name with its code, and
        // capitalise list names inconsistently. Neither should split a list.
        $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
            ['beirut_1', 'unity list', 'John Example', 'LB2', '1975-01-02', 'Maronite', 2],
        ]);

        $preview = $this->post("/api/admin/elections/{$this->election->id}/import/preview", ['file' => $file]);
        $preview->assertOk();
        $preview->assertJsonPath('plan.lists', 1);
        $preview->assertJsonPath('plan.constituencies_to_attach', 1);

        $response = $this->post("/api/admin/elections/{$this->election->id}/import", [
            'file' => $this->standardCsv([
                ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
                ['beirut_1', 'unity list', 'John Example', 'LB2', '1975-01-02', 'Maronite', 2],
            ]),
        ]);

        $response->assertOk();
        $response->assertJsonPath('imported.lists_created', 1);

        $this->assertSame(1, ElectionList::where('election_id', $this->election->id)->count());
        $this->assertSame(2, ListCandidate::count());
    }

    public function test_import_is_refused_on_a_non_draft_election(): void
    {
        $this->loginAsAdmin();

        $this->election->update(['status' => 'active']);

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
        ]);

        $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file])
            ->assertStatus(422);

        $this->assertSame(0, ElectionList::count());
    }

    public function test_import_writes_an_audit_entry(): void
    {
        $admin = $this->loginAsAdmin();

        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
        ]);

        $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'admin.election.candidates_imported',
            'actor_user_id' => $admin->id,
        ]);
    }

    public function test_template_downloads_as_a_spreadsheet(): void
    {
        $this->loginAsAdmin();

        $response = $this->get("/api/admin/elections/{$this->election->id}/import/template");

        $response->assertOk();
        $response->assertHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
    }

    public function test_import_is_admin_only(): void
    {
        $file = $this->standardCsv([
            ['Beirut I', 'Unity List', 'Jane Example', 'LB1', '1980-04-27', 'Maronite', 1],
        ]);

        $this->post("/api/admin/elections/{$this->election->id}/import", ['file' => $file])
            ->assertStatus(401);
    }
}
