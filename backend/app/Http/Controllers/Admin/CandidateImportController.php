<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Services\AuditLogService;
use App\Services\CandidateSheetExportService;
use App\Services\CandidateSheetImportService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CandidateImportController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private CandidateSheetImportService $importer,
    ) {
    }

    /** Parse and validate an uploaded sheet without writing anything. */
    public function preview(Request $request, Election $election)
    {
        $this->validateUpload($request);

        return response()->json(
            $this->importer->preview($election, $request->file('file'))
        );
    }

    /** Write a validated sheet. Refuses the file outright if any row is bad. */
    public function store(Request $request, Election $election)
    {
        $this->validateUpload($request);

        // An election that is open for voting must not have its ballot
        // rewritten underneath the voters.
        if ($election->status !== 'draft') {
            return response()->json([
                'message' => 'Only a draft election can be imported into. Move it back to draft first.',
            ], 422);
        }

        $result = $this->importer->import($election, $request->file('file'));

        if ($result['imported'] === []) {
            return response()->json([
                'message' => 'The sheet has errors; nothing was imported.',
                'preview' => $result['preview'],
            ], 422);
        }

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.election.candidates_imported',
            array_merge(['election_id' => $election->id], $result['imported']),
            $request
        );

        return response()->json($result);
    }

    /**
     * This election's lists and candidates as a spreadsheet, in the same
     * column layout the importer reads — so an export can be edited and put
     * back, or imported into another election to clone its roster.
     */
    public function export(Election $election, CandidateSheetExportService $exporter): StreamedResponse
    {
        $spreadsheet = $exporter->build($election);

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $exporter->filename($election), [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /** A blank sheet with the expected header row and one example. */
    public function template(Election $election): StreamedResponse
    {
        $headers = CandidateSheetImportService::templateHeaders();
        $required = CandidateSheetImportService::requiredHeaders();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Candidates');

        foreach ($headers as $index => $header) {
            $column = $index + 1;
            $sheet->setCellValue([$column, 1], $header);
            $sheet->getStyle([$column, 1])->getFont()->setBold(true);
            $sheet->getColumnDimensionByColumn($column)->setAutoSize(true);

            // Second row documents each column instead of a separate readme.
            $sheet->setCellValue([$column, 2], in_array($header, $required, true) ? 'required' : 'optional');
        }

        $example = [
            'constituency' => 'Beirut I',
            'list_name_en' => 'Unity List',
            'list_name_ar' => 'لائحة الوحدة',
            'list_code' => 'BEIRUT1_UNITY',
            'candidate_name' => 'Jane Example',
            'candidate_name_ar' => 'جين مثال',
            'national_id' => 'LB1234567890',
            'date_of_birth' => '1980-04-27',
            'confession' => 'Maronite',
            'district' => 'Beirut',
            'position' => 1,
            'status' => 'accepted',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 3], $example[$header] ?? '');
        }

        $filename = 'candidate-import-template.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            (new Xlsx($spreadsheet))->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function validateUpload(Request $request): void
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120', 'mimes:xlsx,xls,csv,txt'],
        ], [
            'file.mimes' => 'Upload an .xlsx, .xls or .csv file.',
            'file.max' => 'The file must be 5 MB or smaller.',
        ]);
    }
}
