<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ListCandidate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Writes an election's lists and candidates back out as a spreadsheet, in
 * exactly the column layout CandidateSheetImportService reads.
 *
 * That symmetry is the point: an export can be edited and re-imported, and
 * an election's roster can be cloned into another election by exporting it
 * and importing the file there.
 */
class CandidateSheetExportService
{
    public function build(Election $election): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();

        $this->writeMemberships($spreadsheet, $election);
        $this->writeUnassignedCandidates($spreadsheet, $election);

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    public function filename(Election $election): string
    {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9]+/', '-', $election->title) ?? 'election', '-'));

        return ($slug === '' ? 'election' : $slug) . '-candidates.xlsx';
    }

    /** One row per candidate on a list — the importable sheet. */
    private function writeMemberships(Spreadsheet $spreadsheet, Election $election): void
    {
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Candidates');

        $headers = CandidateSheetImportService::templateHeaders();
        $this->writeHeaderRow($sheet, $headers);

        $memberships = ListCandidate::query()
            ->whereIn('list_id', $election->lists()->select('id'))
            ->with([
                'list.constituency',
                'candidacy.candidateProfile',
                'candidacy.district',
                'candidacy.confession',
            ])
            ->get()
            ->sortBy([
                fn ($a, $b) => strcmp(
                    (string) $a->list?->constituency?->name_en,
                    (string) $b->list?->constituency?->name_en
                ),
                fn ($a, $b) => strcmp(
                    (string) ($a->list?->list_name_en ?? $a->list?->list_name),
                    (string) ($b->list?->list_name_en ?? $b->list?->list_name)
                ),
                fn ($a, $b) => ($a->position_order ?? PHP_INT_MAX) <=> ($b->position_order ?? PHP_INT_MAX),
            ]);

        $row = 2;

        foreach ($memberships as $membership) {
            $list = $membership->list;
            $candidacy = $membership->candidacy;
            $profile = $candidacy?->candidateProfile;

            $values = [
                'constituency' => $list?->constituency?->name_en ?? $list?->constituency?->code,
                'list_name_en' => $list?->list_name_en ?? $list?->list_name,
                'list_name_ar' => $list?->list_name_ar,
                'list_code' => $list?->list_code,
                'candidate_name' => $profile?->full_name,
                'candidate_name_ar' => $profile?->full_name_ar,
                'national_id' => $profile?->national_id_number,
                'date_of_birth' => $profile?->date_of_birth?->format('Y-m-d'),
                'confession' => $candidacy?->confession?->name_en,
                'district' => $candidacy?->district?->name_en,
                'position' => $membership->position_order,
                'status' => $candidacy?->status,
            ];

            $this->writeRow($sheet, $headers, $values, $row++);
        }

        $this->autoSize($sheet, count($headers));
        $sheet->freezePane('A2');
    }

    /**
     * Candidacies registered in the election but on no list. They can't go in
     * the importable sheet (a row there needs a list), so they get their own
     * tab rather than being dropped from the export without a word.
     */
    private function writeUnassignedCandidates(Spreadsheet $spreadsheet, Election $election): void
    {
        $onAList = ListCandidate::query()
            ->whereIn('list_id', $election->lists()->select('id'))
            ->select('candidacy_id');

        $unassigned = Candidacy::query()
            ->where('election_id', $election->id)
            ->whereNotIn('id', $onAList)
            ->with(['candidateProfile', 'constituency', 'district', 'confession'])
            ->get();

        if ($unassigned->isEmpty()) {
            return;
        }

        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Unassigned candidates');

        $headers = ['constituency', 'candidate_name', 'candidate_name_ar', 'national_id', 'date_of_birth', 'confession', 'district', 'status'];
        $this->writeHeaderRow($sheet, $headers);

        $row = 2;

        foreach ($unassigned as $candidacy) {
            $profile = $candidacy->candidateProfile;

            $this->writeRow($sheet, $headers, [
                'constituency' => $candidacy->constituency?->name_en ?? $candidacy->constituency?->code,
                'candidate_name' => $profile?->full_name,
                'candidate_name_ar' => $profile?->full_name_ar,
                'national_id' => $profile?->national_id_number,
                'date_of_birth' => $profile?->date_of_birth?->format('Y-m-d'),
                'confession' => $candidacy->confession?->name_en,
                'district' => $candidacy->district?->name_en,
                'status' => $candidacy->status,
            ], $row++);
        }

        $this->autoSize($sheet, count($headers));
        $sheet->freezePane('A2');
    }

    private function writeHeaderRow($sheet, array $headers): void
    {
        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $style = $sheet->getStyle([1, 1, count($headers), 1]);
        $style->getFont()->setBold(true);
        $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('EFE7CC');
    }

    private function writeRow($sheet, array $headers, array $values, int $row): void
    {
        foreach ($headers as $index => $header) {
            $value = $values[$header] ?? null;
            $cell = $sheet->getCell([$index + 1, $row]);

            // National IDs and list codes are identifiers: written as text so
            // a leading zero survives the round trip back through the import.
            if (in_array($header, ['national_id', 'list_code'], true) && $value !== null) {
                $cell->setValueExplicit((string) $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                continue;
            }

            $cell->setValue($value);
        }
    }

    private function autoSize($sheet, int $columns): void
    {
        for ($column = 1; $column <= $columns; $column++) {
            $sheet->getColumnDimensionByColumn($column)->setAutoSize(true);
        }
    }
}
