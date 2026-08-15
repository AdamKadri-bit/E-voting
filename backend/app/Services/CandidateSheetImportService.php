<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Confession;
use App\Models\Constituency;
use App\Models\District;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/**
 * Reads a spreadsheet of candidates and turns it into an election's lists,
 * candidate profiles, candidacies and list memberships.
 *
 * One row is one candidate on one list. Everything is matched by name or
 * code against what is already seeded — the import never invents a
 * constituency, district or confession, it only fails the row that names one
 * it can't find. Parsing and validation are separate from writing, so the
 * admin sees exactly what a file would do before anything is created.
 */
class CandidateSheetImportService
{
    /** Canonical column => accepted header spellings (lowercased, trimmed). */
    private const COLUMNS = [
        'constituency' => ['constituency', 'constituency_name', 'dairah', 'circonscription'],
        'list_name_en' => ['list_name_en', 'list', 'list_name', 'list name'],
        'list_name_ar' => ['list_name_ar', 'list name ar', 'list_ar'],
        'list_code' => ['list_code', 'list code'],
        'candidate_name' => ['candidate_name', 'candidate', 'full_name', 'name'],
        'candidate_name_ar' => ['candidate_name_ar', 'full_name_ar', 'name_ar'],
        'national_id' => ['national_id', 'national_id_number', 'nid', 'id_number'],
        'date_of_birth' => ['date_of_birth', 'dob', 'birth_date', 'birthdate'],
        'confession' => ['confession', 'sect', 'religion'],
        'district' => ['district', 'caza', 'qada'],
        'position' => ['position', 'position_order', 'order', 'rank'],
        'status' => ['status', 'candidacy_status'],
    ];

    private const REQUIRED = ['constituency', 'list_name_en', 'candidate_name', 'national_id', 'date_of_birth'];

    private const STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

    /** Rows beyond this are rejected rather than parsed, to bound memory. */
    private const MAX_ROWS = 5000;

    /** Reference tables, loaded once: every row looks names up against them. */
    private ?\Illuminate\Support\Collection $constituencies = null;
    private ?\Illuminate\Support\Collection $districts = null;
    private ?\Illuminate\Support\Collection $confessions = null;

    /**
     * Parses and validates a sheet without writing anything.
     *
     * @return array{
     *   headers: array<string, string>, missing_headers: string[],
     *   rows: array<int, array{line: int, values: array<string, mixed>, errors: string[]}>,
     *   valid_rows: int, invalid_rows: int, errors: string[], plan: array<string, mixed>
     * }
     */
    public function preview(Election $election, UploadedFile $file): array
    {
        $sheet = $this->readRows($file);

        if ($sheet['errors'] !== []) {
            return $this->emptyResult($sheet['errors'], $sheet['headers'] ?? [], $sheet['missing_headers'] ?? []);
        }

        $rows = [];
        $seenMembership = [];

        $lists = [];
        $candidates = [];
        $constituencies = [];

        foreach ($sheet['rows'] as $row) {
            $validated = $this->validateRow($election, $row['values']);
            $errors = $validated['errors'];

            // Keyed on the resolved constituency, so "Beirut I" and
            // "BEIRUT_1" count as the same list rather than two.
            $listKey = $errors === []
                ? $validated['resolved']['constituency_id'] . '|' . $this->normalise((string) $validated['values']['list_name_en'])
                : null;

            // A candidate can appear once per list; a repeated pair is almost
            // always a copy-paste slip, so it's flagged rather than silently
            // collapsed.
            if ($listKey !== null) {
                $memberKey = $listKey . '|' . $this->normalise((string) $validated['values']['national_id']);

                if (isset($seenMembership[$memberKey])) {
                    $errors[] = "Duplicate of row {$seenMembership[$memberKey]}: same candidate on the same list.";
                } else {
                    $seenMembership[$memberKey] = $row['line'];
                }
            }

            if ($errors === []) {
                $lists[$listKey] = true;
                $candidates[$validated['values']['national_id']] = true;
                $constituencies[$validated['resolved']['constituency_id']] = true;
            }

            $rows[] = [
                'line' => $row['line'],
                'values' => $validated['values'],
                'errors' => $errors,
            ];
        }

        $valid = collect($rows)->filter(fn ($r) => $r['errors'] === [])->count();

        $attachedIds = $election->constituencies()->pluck('constituencies.id')->all();
        $toAttach = array_values(array_diff(array_keys($constituencies), $attachedIds));

        return [
            'headers' => $sheet['headers'],
            'missing_headers' => [],
            'rows' => $rows,
            'valid_rows' => $valid,
            'invalid_rows' => count($rows) - $valid,
            'errors' => [],
            'plan' => [
                'lists' => count($lists),
                'candidates' => count($candidates),
                'memberships' => $valid,
                'constituencies_to_attach' => count($toAttach),
            ],
        ];
    }

    /**
     * Writes a validated sheet. Rejects the whole file if any row is invalid —
     * a half-imported ballot is worse than none.
     *
     * @return array{imported: array<string, int>, preview: array<string, mixed>}
     */
    public function import(Election $election, UploadedFile $file): array
    {
        $preview = $this->preview($election, $file);

        if ($preview['errors'] !== [] || $preview['invalid_rows'] > 0) {
            return ['imported' => [], 'preview' => $preview];
        }

        $created = [
            'constituencies_attached' => 0,
            'lists_created' => 0,
            'candidate_profiles_created' => 0,
            'candidacies_created' => 0,
            'memberships_created' => 0,
            'rows_processed' => 0,
        ];

        DB::transaction(function () use ($election, $preview, &$created) {
            foreach ($preview['rows'] as $row) {
                $resolved = $this->validateRow($election, $row['values'])['resolved'];
                $values = $row['values'];

                // Importing lists for a constituency implies it takes part.
                if (!$election->constituencies()->where('constituencies.id', $resolved['constituency_id'])->exists()) {
                    $election->constituencies()->attach($resolved['constituency_id']);
                    $created['constituencies_attached']++;
                }

                // Matched case-insensitively so "Unity List" and "unity list"
                // in the same sheet land on one list, not two.
                $list = ElectionList::query()
                    ->where('election_id', $election->id)
                    ->where('constituency_id', $resolved['constituency_id'])
                    ->whereRaw('LOWER(list_name) = ?', [mb_strtolower(trim((string) $values['list_name_en']))])
                    ->first();

                if (!$list) {
                    $list = ElectionList::create([
                        'election_id' => $election->id,
                        'constituency_id' => $resolved['constituency_id'],
                        'list_name' => $values['list_name_en'],
                        'list_name_en' => $values['list_name_en'],
                        'list_name_ar' => $values['list_name_ar'] ?: null,
                        'list_code' => $values['list_code'] ?: $this->listCode($election, $resolved['constituency_id'], $values['list_name_en']),
                        'is_withdrawn' => false,
                    ]);
                    $created['lists_created']++;
                }

                $profile = CandidateProfile::where('national_id_number', $values['national_id'])->first();

                if (!$profile) {
                    $profile = CandidateProfile::create([
                        'national_id_number' => $values['national_id'],
                        'full_name' => $values['candidate_name'],
                        'full_name_ar' => $values['candidate_name_ar'] ?: null,
                        'date_of_birth' => $values['date_of_birth'],
                    ]);
                    $created['candidate_profiles_created']++;
                }

                $candidacy = Candidacy::firstOrNew([
                    'election_id' => $election->id,
                    'candidate_profile_id' => $profile->id,
                    'constituency_id' => $resolved['constituency_id'],
                ]);

                if (!$candidacy->exists) {
                    $candidacy->fill([
                        'district_id' => $resolved['district_id'],
                        'confession_id' => $resolved['confession_id'],
                        'status' => $values['status'],
                    ])->save();
                    $created['candidacies_created']++;
                }

                $membership = ListCandidate::firstOrNew([
                    'list_id' => $list->id,
                    'candidacy_id' => $candidacy->id,
                ]);

                if (!$membership->exists) {
                    $membership->fill(['position_order' => $values['position']])->save();
                    $created['memberships_created']++;
                }

                $created['rows_processed']++;
            }
        });

        return ['imported' => $created, 'preview' => $preview];
    }

    /** Column headers the sheet must carry, for the template and the docs. */
    public static function templateHeaders(): array
    {
        return array_keys(self::COLUMNS);
    }

    public static function requiredHeaders(): array
    {
        return self::REQUIRED;
    }

    /**
     * Reads the file into canonical-keyed rows.
     *
     * @return array{headers?: array<string,string>, rows?: array<int, array{line: int, values: array<string,mixed>}>, errors: string[], missing_headers?: string[]}
     */
    private function readRows(UploadedFile $file): array
    {
        try {
            $reader = IOFactory::createReaderForFile($file->getRealPath());
            $reader->setReadDataOnly(true);
            $worksheet = $reader->load($file->getRealPath())->getActiveSheet();
        } catch (\Throwable $e) {
            return ['errors' => ['The file could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.']];
        }

        $rowIterator = $worksheet->getRowIterator();
        $headerMap = [];
        $rows = [];
        $lineNumber = 0;

        foreach ($rowIterator as $row) {
            $lineNumber = $row->getRowIndex();
            $cells = [];

            foreach ($row->getCellIterator() as $cell) {
                $cells[$cell->getColumn()] = $cell;
            }

            if ($headerMap === []) {
                $headerMap = $this->mapHeaders($cells);

                if ($headerMap === []) {
                    return ['errors' => ['The first row must be a header row naming the columns.']];
                }

                $missing = array_values(array_diff(self::REQUIRED, array_values($headerMap)));

                if ($missing !== []) {
                    return [
                        'errors' => ['The sheet is missing required column(s): ' . implode(', ', $missing) . '.'],
                        'headers' => $headerMap,
                        'missing_headers' => $missing,
                    ];
                }

                continue;
            }

            $values = [];
            $isEmpty = true;

            foreach ($headerMap as $column => $key) {
                $cell = $cells[$column] ?? null;
                $value = $this->cellValue($cell, $key);
                $values[$key] = $value;

                if ($value !== null && $value !== '') {
                    $isEmpty = false;
                }
            }

            if ($isEmpty) {
                continue;
            }

            $rows[] = ['line' => $lineNumber, 'values' => $values];

            if (count($rows) > self::MAX_ROWS) {
                return ['errors' => ['The sheet has more than ' . self::MAX_ROWS . ' rows; split it into smaller files.']];
            }
        }

        if ($rows === []) {
            return ['errors' => ['The sheet has a header row but no data rows.'], 'headers' => $headerMap];
        }

        return ['headers' => $headerMap, 'rows' => $rows, 'errors' => []];
    }

    /** @param array<string, Cell> $cells */
    private function mapHeaders(array $cells): array
    {
        $map = [];

        foreach ($cells as $column => $cell) {
            $header = strtolower(trim((string) $cell->getValue()));
            $header = str_replace(['-', '  '], [' ', ' '], $header);

            foreach (self::COLUMNS as $key => $aliases) {
                if (in_array($header, $aliases, true) || $header === $key) {
                    $map[$column] = $key;
                    break;
                }
            }
        }

        return $map;
    }

    private function cellValue(?Cell $cell, string $key): mixed
    {
        if ($cell === null) {
            return null;
        }

        $raw = $cell->getValue();

        if ($key === 'date_of_birth') {
            // Excel stores dates as serial numbers; a CSV gives a string.
            if (is_numeric($raw)) {
                try {
                    return ExcelDate::excelToDateTimeObject((float) $raw)->format('Y-m-d');
                } catch (\Throwable $e) {
                    return (string) $raw;
                }
            }

            return $raw === null ? null : trim((string) $raw);
        }

        if ($key === 'position') {
            return $raw === null || $raw === '' ? null : (int) $raw;
        }

        // National IDs are identifiers, not numbers: keep leading zeroes.
        return $raw === null ? null : trim((string) $raw);
    }

    /**
     * @return array{values: array<string, mixed>, resolved: array<string, ?int>, errors: string[]}
     */
    private function validateRow(Election $election, array $values): array
    {
        $errors = [];

        $values = array_merge(array_fill_keys(array_keys(self::COLUMNS), null), $values);

        foreach (self::REQUIRED as $key) {
            if ($values[$key] === null || $values[$key] === '') {
                $errors[] = ucfirst(str_replace('_', ' ', $key)) . ' is required.';
            }
        }

        $constituency = $values['constituency'] ? $this->findConstituency($values['constituency']) : null;
        if ($values['constituency'] && !$constituency) {
            $errors[] = "Unknown constituency \"{$values['constituency']}\".";
        }

        $district = null;
        if ($values['district']) {
            $district = $this->findDistrict($values['district']);
            if (!$district) {
                $errors[] = "Unknown district \"{$values['district']}\".";
            }
        }

        $confession = null;
        if ($values['confession']) {
            $confession = $this->findConfession($values['confession']);
            if (!$confession) {
                $errors[] = "Unknown confession \"{$values['confession']}\".";
            }
        }

        if ($values['date_of_birth']) {
            try {
                $values['date_of_birth'] = Carbon::parse((string) $values['date_of_birth'])->format('Y-m-d');
            } catch (\Throwable $e) {
                $errors[] = "Date of birth \"{$values['date_of_birth']}\" is not a date.";
            }
        }

        $status = strtolower(trim((string) ($values['status'] ?? '')));
        if ($status === '') {
            $status = 'accepted';
        } elseif (!in_array($status, self::STATUSES, true)) {
            $errors[] = "Status \"{$values['status']}\" must be one of: " . implode(', ', self::STATUSES) . '.';
        }
        $values['status'] = $status;

        if ($values['position'] !== null && $values['position'] < 1) {
            $errors[] = 'Position must be 1 or greater.';
        }

        // A national ID already used by a different name is a data conflict the
        // admin has to resolve; silently reusing the profile would rename them.
        if ($values['national_id'] && $values['candidate_name']) {
            $existing = CandidateProfile::where('national_id_number', $values['national_id'])->first();

            if ($existing && $this->normalise($existing->full_name) !== $this->normalise((string) $values['candidate_name'])) {
                $errors[] = "National ID {$values['national_id']} is already registered to \"{$existing->full_name}\".";
            }
        }

        return [
            'values' => $values,
            'resolved' => [
                'constituency_id' => $constituency?->id,
                'district_id' => $district?->id,
                'confession_id' => $confession?->id,
            ],
            'errors' => $errors,
        ];
    }

    private function findConstituency(string $needle): ?Constituency
    {
        $this->constituencies ??= Constituency::all();

        return $this->matchByName($this->constituencies, $needle);
    }

    private function findDistrict(string $needle): ?District
    {
        $this->districts ??= District::all();

        return $this->matchByName($this->districts, $needle);
    }

    private function findConfession(string $needle): ?Confession
    {
        $this->confessions ??= Confession::all();

        return $this->matchByName($this->confessions, $needle);
    }

    /** Matches a sheet value against a model's English name, Arabic name or code. */
    private function matchByName(\Illuminate\Support\Collection $models, string $needle): mixed
    {
        $needle = $this->normalise($needle);

        return $models->first(fn ($model) => in_array($needle, [
            $this->normalise((string) $model->name_en),
            $this->normalise((string) $model->name_ar),
            $this->normalise((string) $model->code),
        ], true));
    }

    /** Case, spacing, underscores and dash styles shouldn't decide a match. */
    private function normalise(string $value): string
    {
        $value = str_replace(['_', '-', '–', '—'], ' ', mb_strtolower(trim($value)));

        return preg_replace('/\s+/u', ' ', $value) ?? $value;
    }

    private function listCode(Election $election, int $constituencyId, string $name): string
    {
        $slug = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '_', $name) ?? 'LIST');

        return substr("{$election->id}_{$constituencyId}_{$slug}", 0, 160);
    }

    private function emptyResult(array $errors, array $headers, array $missing): array
    {
        return [
            'headers' => $headers,
            'missing_headers' => $missing,
            'rows' => [],
            'valid_rows' => 0,
            'invalid_rows' => 0,
            'errors' => $errors,
            'plan' => [
                'lists' => 0,
                'candidates' => 0,
                'memberships' => 0,
                'constituencies_to_attach' => 0,
            ],
        ];
    }
}
