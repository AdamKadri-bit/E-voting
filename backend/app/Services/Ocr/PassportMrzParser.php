<?php

namespace App\Services\Ocr;

/**
 * Reads a passport photo page through its machine-readable zone (ICAO 9303
 * TD3: two lines of 44 characters). The MRZ is standardised on every passport
 * and carries check digits, so misread characters are detected rather than
 * silently accepted. OCR often splits a line of '<' fillers into pieces;
 * the second line is located by its fixed structure and everything between
 * the "P" start and it is taken as the first line.
 *
 * Current Lebanese passports also print the father's name, the mother's full
 * name and the registry place and number (on the page facing the photo page).
 * Those are read from the visual zone by their bilingual labels, preferring
 * the English line — holograms over the photo page often damage the Arabic.
 */
final class PassportMrzParser
{
    private const LINE2 = '/([A-Z0-9<]{9})([0-9<])([A-Z<]{3})(\d{6})(\d)([MFX<])(\d{6})(\d)([A-Z0-9<]{14})([0-9<])(\d)/';

    /** @return array{data: array, mrz_valid: bool, found: bool} */
    public function parse(OcrPage $page): array
    {
        $stream = '';
        foreach (preg_split('/\R/u', strtoupper($page->text)) ?: [] as $line) {
            $l = str_replace([' ', '«', '‹', '＜'], ['', '<<', '<', '<'], $line);
            if (strlen($l) >= 5 && preg_match('/^[A-Z0-9<]+$/', $l) && (str_contains($l, '<') || strlen($l) >= 30)) {
                $stream .= $l;
            }
        }

        if (!preg_match(self::LINE2, $stream, $m, PREG_OFFSET_CAPTURE)) {
            return ['data' => $this->empty(), 'mrz_valid' => false, 'found' => false];
        }
        $line2Start = $m[0][1];
        $pStart = strrpos(substr($stream, 0, $line2Start), 'P');
        $line1 = $pStart === false ? '' : substr($stream, $pStart, $line2Start - $pStart);
        $line1 = str_pad($line1, 44, '<');

        [$number, $numberCheck, $nationality, $dob, $dobCheck, $sex, $expiry, $expiryCheck, $optional, $optionalCheck, $composite] =
            array_map(fn ($g) => $g[0], array_slice($m, 1));

        $valid = self::check($number) === $numberCheck
            && self::check($dob) === $dobCheck
            && self::check($expiry) === $expiryCheck
            && ($optionalCheck === '<' || self::check($optional) === $optionalCheck)
            && self::check($number . $numberCheck . $dob . $dobCheck . $expiry . $expiryCheck . $optional . $optionalCheck) === $composite;

        $names = explode('<<', substr($line1, 5), 2);
        $surname = trim(str_replace('<', ' ', $names[0] ?? ''));
        $given = trim(preg_replace('/\s+/', ' ', str_replace('<', ' ', $names[1] ?? '')) ?? '');

        $data = $this->empty();
        $visual = $this->visualZone($page->text);
        $data['father_name'] = $visual['father_name'];
        $data['mother_name'] = $visual['mother_name'];
        $data['place_of_birth'] = $visual['place_of_birth'];
        $data['civil_registry_number'] = $visual['civil_registry_number'];
        $data['full_name'] = $this->title(trim("{$given} {$surname}"));
        $data['date_of_birth'] = $this->mrzDate($dob, true);
        $data['passport_number'] = rtrim($number, '<');
        $data['nationality'] = str_replace('<', '', $nationality);
        $data['issuing_state'] = str_replace('<', '', substr($line1, 2, 3));
        $data['sex'] = $sex === '<' ? '' : $sex;
        $data['expiry_date'] = $this->mrzDate($expiry, false);

        return ['data' => $data, 'mrz_valid' => $valid, 'found' => true];
    }

    /** Label (lower-case English part) => field, for the passport's bilingual captions. */
    private const VISUAL_LABELS = [
        'mother full name' => 'mother_name',
        "mother's name" => 'mother_name',
        'mother name' => 'mother_name',
        'father name' => 'father_name',
        "father's name" => 'father_name',
        'registry place and number' => 'registry',
        'place of birth' => 'place_of_birth',
    ];

    /** Any caption — stops a field's value from running into the next field. */
    private const ANY_LABEL = '/\b(name|first name|surname|date of birth|nationality|place of birth|sex|authority|issuance date|expiry date|profession|signature|passport|registry|code|type)\b|\s\/\s/i';

    private function visualZone(string $text): array
    {
        $out = ['father_name' => '', 'mother_name' => '', 'place_of_birth' => '', 'civil_registry_number' => ''];
        $lines = array_values(array_filter(array_map('trim', preg_split('/\R/u', $text) ?: [])));

        foreach ($lines as $i => $line) {
            $lower = mb_strtolower($line);
            foreach (self::VISUAL_LABELS as $label => $field) {
                if (!str_contains($lower, $label)) {
                    continue;
                }
                // The value: the rest of this line after the caption, then the next lines until another caption.
                $rest = trim(preg_replace('/^.*' . preg_quote($label, '/') . '\s*[:\/]?/iu', '', $line) ?? '');
                $candidates = $rest !== '' ? [$rest] : [];
                for ($j = $i + 1; $j < count($lines) && $j <= $i + 3; $j++) {
                    if (preg_match(self::ANY_LABEL, $lines[$j]) || str_starts_with($lines[$j], 'P<')) {
                        break;
                    }
                    $candidates[] = $lines[$j];
                }

                if ($field === 'registry') {
                    $digits = preg_replace('/\D/', '', ArabicText::digits(implode(' ', $candidates))) ?? '';
                    $out['civil_registry_number'] = $out['civil_registry_number'] ?: $digits;
                    continue 2;
                }
                if ($out[$field] === '') {
                    $out[$field] = $this->pickName($candidates);
                }
                continue 2;
            }
        }

        return $out;
    }

    /** English (Latin) value when present — it survives holograms better — else the Arabic one. */
    private function pickName(array $candidates): string
    {
        foreach ($candidates as $c) {
            $latin = trim(preg_replace('/[^A-Za-z\s\-\']/u', '', $c) ?? '');
            // Drop one-letter debris (e.g. an Arabic colon misread as "J").
            $latin = trim(implode(' ', array_filter(preg_split('/\s+/', $latin) ?: [], fn ($w) => strlen($w) > 1)));
            if (preg_match('/[A-Za-z]{2,}/', $latin)) {
                return $this->title(preg_replace('/\s+/', ' ', $latin) ?? $latin);
            }
        }
        foreach ($candidates as $c) {
            $arabic = trim(preg_replace('/[^\x{0600}-\x{06FF}\s]/u', '', $c) ?? '');
            if (mb_strlen($arabic) >= 2) {
                return preg_replace('/\s+/u', ' ', $arabic) ?? $arabic;
            }
        }

        return '';
    }

    /** ICAO 9303 check digit: weights 7-3-1, '<' = 0, A-Z = 10-35. */
    public static function check(string $s): string
    {
        $w = [7, 3, 1];
        $sum = 0;
        foreach (str_split($s) as $i => $c) {
            $v = $c === '<' ? 0 : (ctype_digit($c) ? (int) $c : ord($c) - 55);
            $sum += $v * $w[$i % 3];
        }

        return (string) ($sum % 10);
    }

    private function mrzDate(string $yymmdd, bool $past): string
    {
        $yy = (int) substr($yymmdd, 0, 2);
        $now = (int) date('y');
        $year = $past ? ($yy > $now ? 1900 + $yy : 2000 + $yy) : 2000 + $yy;
        $m = (int) substr($yymmdd, 2, 2);
        $d = (int) substr($yymmdd, 4, 2);

        return checkdate($m, $d, $year) ? sprintf('%04d-%02d-%02d', $year, $m, $d) : '';
    }

    private function title(string $s): string
    {
        return mb_convert_case(mb_strtolower($s), MB_CASE_TITLE);
    }

    private function empty(): array
    {
        return [
            'full_name' => '', 'father_name' => '', 'mother_name' => '', 'date_of_birth' => '',
            'place_of_birth' => '', 'national_id_number' => '', 'civil_registry_number' => '',
            'governorate' => '', 'district' => '', 'locality' => '',
        ];
    }
}
