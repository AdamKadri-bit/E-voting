<?php

namespace App\Services\Ocr;

use App\Services\LebaneseIdOcrService;

/**
 * One entry point for every accepted identity document:
 *   national_id  — Lebanese ID card, front + back (existing parser)
 *   ikhraj_qayd  — individual civil-registry extract, one page
 *   passport     — passport photo page, read through its MRZ
 * The result always has the same fields; anything a document can't provide
 * is listed in `missing` for the voter to type, with a `warnings` note.
 * The registry match itself is unchanged, whichever document was scanned.
 */
class IdentityDocumentOcrService
{
    public const TYPES = ['national_id', 'ikhraj_qayd', 'passport'];

    public const REQUIRED = ['full_name', 'father_name', 'mother_name', 'date_of_birth'];

    public function __construct(
        private TextReader $reader,
        private LebaneseIdOcrService $nationalId,
    ) {
    }

    public function extract(string $type, string $frontPath, ?string $backPath = null): array
    {
        $warnings = [];
        $text = null;

        switch ($type) {
            case 'national_id':
                $data = $this->nationalId->extractFromImages($frontPath, (string) $backPath);
                $debug = $data['ocr_debug'] ?? null;
                unset($data['ocr_debug']);
                break;

            case 'ikhraj_qayd':
                $page = $this->reader->read($frontPath);
                $text = $page->text;
                $data = (new IkhrajQaydParser())->parse($page);
                if (count(array_filter($data)) < 3) {
                    $warnings[] = 'The extract\'s fields could not be found. Make sure the whole page is in the photo, flat and in focus — or type your details below.';
                }
                break;

            case 'passport':
                $page = $this->reader->read($frontPath);
                $text = $page->text;
                $result = (new PassportMrzParser())->parse($page);
                $data = $result['data'];
                if (!$result['found']) {
                    $warnings[] = 'The two lines of <<< characters at the bottom of the passport photo page were not found. Photograph the whole page, including those lines.';
                } elseif (!$result['mrz_valid']) {
                    $warnings[] = 'Some characters in the passport\'s machine-readable lines were misread (the check digits don\'t match). Check your name and date of birth carefully.';
                }
                if (($data['father_name'] ?? '') === '' || ($data['mother_name'] ?? '') === '') {
                    $warnings[] = 'Your father\'s or mother\'s name could not be read. Include the page facing the photo page (it shows the mother\'s name and registry number), or type them.';
                }
                break;

            default:
                throw new \InvalidArgumentException('Unsupported document type.');
        }

        $response = [
            'document_type' => $type,
            'data' => $data,
            'missing' => array_values(array_filter(self::REQUIRED, fn ($k) => trim((string) ($data[$k] ?? '')) === '')),
            'warnings' => $warnings,
        ];

        // Raw OCR text reproduces the whole document (for an extract, including
        // religious sect), so it is only returned in local debug environments.
        if (config('app.debug')) {
            $response['ocr_debug'] = $debug ?? ['text' => $text];
        }

        return $response;
    }
}
