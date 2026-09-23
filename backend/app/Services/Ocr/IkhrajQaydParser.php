<?php

namespace App\Services\Ocr;

/**
 * Reads an individual civil-registry extract (إخراج قيد فردي).
 *
 * The extract is a two-column table, and OCR returns the label column and
 * the value column in separate runs — so a value can't be found by reading
 * "the line after the label". Instead each value is paired with its label by
 * position: the page is de-skewed using the text's own slope (phone photos
 * are rarely straight), then the value is the text on the same row, on the
 * value side of the label (left, since the document is right-to-left), or
 * failing that directly below it.
 *
 * Religious sect (المذهب), sex and marital status are printed on the extract
 * but deliberately never extracted: registry matching doesn't need them.
 */
final class IkhrajQaydParser
{
    /** field => label spellings, already normalised (see ArabicText::normalize). */
    private const LABELS = [
        'last_name' => ['الشهره', 'اسم العائله', 'العائله'],
        'first_name' => ['الاسم', 'الاسم الاول'],
        'father_name' => ['اسم الاب', 'اسم الوالد'],
        'mother_name' => ['اسم الام وشهرتها', 'اسم الام', 'اسم الوالده', 'اسم الام وشهرتها قبل الزواج'],
        'place_and_date' => ['محل وتاريخ الولاده', 'محل الولاده وتاريخها', 'مكان وتاريخ الولاده'],
        'place_of_birth' => ['محل الولاده', 'مكان الولاده'],
        'date_of_birth' => ['تاريخ الولاده'],
        'civil_registry_number' => ['رقم السجل'],
        'governorate' => ['المحافظه'],
        'district' => ['القضاء'],
        'locality' => ['المحله او القريه', 'المحله', 'القريه', 'البلده', 'المحله او البلده'],
    ];

    /** Printed on the extract but never read — labels only, so their values aren't mistaken for ours. */
    private const IGNORED = ['المذهب', 'الطائفه', 'الجنس', 'الوضع العائلي', 'صدر في', 'توقيع'];

    public function parse(OcrPage $page): array
    {
        $items = $this->deskew($page->items);
        $labels = [];
        foreach ($items as $i => $item) {
            $norm = ArabicText::normalize($item['text']);
            foreach ([...self::LABELS, 'ignored' => self::IGNORED] as $field => $variants) {
                foreach ($variants as $v) {
                    if ($norm === $v) {
                        $labels[$i] = ['field' => $field, 'inline' => null];
                        continue 3;
                    }
                    if (str_starts_with($norm, $v . ' ') && $field !== 'first_name') {
                        $labels[$i] = ['field' => $field, 'inline' => trim(mb_substr($norm, mb_strlen($v)))];
                        continue 3;
                    }
                }
            }
        }

        $values = [];
        $used = [];
        foreach ($labels as $i => $label) {
            if ($label['field'] === 'ignored') {
                continue;
            }
            $value = $label['inline'] ?? $this->valueFor($i, $items, $labels, $used);
            if ($value !== null && $value !== '') {
                $values[$label['field']] ??= $value;
            }
        }

        $place = $values['place_of_birth'] ?? '';
        $date = ArabicText::date($values['date_of_birth'] ?? '');
        if (isset($values['place_and_date'])) {
            $date = $date ?: ArabicText::date($values['place_and_date']);
            $place = $place ?: trim(preg_replace('/[\d٠-٩۰-۹\/\-.\s]+$/u', '', $values['place_and_date']) ?? '');
        }

        $first = $values['first_name'] ?? '';
        $last = $values['last_name'] ?? '';

        return [
            'full_name' => trim("{$first} {$last}"),
            'father_name' => $values['father_name'] ?? '',
            'mother_name' => $values['mother_name'] ?? '',
            'date_of_birth' => $date,
            'place_of_birth' => $place,
            'national_id_number' => '',
            'civil_registry_number' => preg_replace('/\D/', '', ArabicText::digits($values['civil_registry_number'] ?? '')) ?? '',
            'governorate' => $values['governorate'] ?? '',
            'district' => $values['district'] ?? '',
            'locality' => $values['locality'] ?? '',
        ];
    }

    /** The value on the label's row (left of it), else the nearest text right below it. */
    private function valueFor(int $labelIndex, array $items, array $labels, array &$used): ?string
    {
        $l = $items[$labelIndex];
        $rowTolerance = max(12.0, $l['h'] * 0.75);
        $best = null;
        $bestScore = INF;

        foreach ($items as $j => $c) {
            if ($j === $labelIndex || isset($labels[$j]) || isset($used[$j])) {
                continue;
            }
            $dy = abs($c['cy'] - $l['cy']);
            if ($dy <= $rowTolerance && $c['cx'] < $l['cx']) {
                $score = $dy * 4 + ($l['x1'] - $c['x2']);
            } elseif ($c['cy'] > $l['cy'] && $c['cy'] - $l['cy'] <= $l['h'] * 2.2 && $c['x1'] < $l['x2'] && $c['x2'] > $l['x1']) {
                $score = 10000 + ($c['cy'] - $l['cy']);
            } else {
                continue;
            }
            if ($score < $bestScore) {
                $bestScore = $score;
                $best = $j;
            }
        }

        if ($best === null) {
            return null;
        }
        $used[$best] = true;

        return trim($items[$best]['text']);
    }

    /** Rotates every item so the page's text lines are horizontal; adds centre and extents. */
    private function deskew(array $raw): array
    {
        $angles = [];
        foreach ($raw as $it) {
            if (count($it['box'] ?? []) >= 2) {
                [$x0, $y0] = $it['box'][0];
                [$x1, $y1] = $it['box'][1];
                if (abs($x1 - $x0) > 20) {
                    $a = atan2($y1 - $y0, $x1 - $x0);
                    if (abs($a) < deg2rad(20)) {
                        $angles[] = $a;
                    }
                }
            }
        }
        sort($angles);
        $angle = $angles ? $angles[intdiv(count($angles), 2)] : 0.0;
        $cos = cos(-$angle);
        $sin = sin(-$angle);

        $out = [];
        foreach ($raw as $it) {
            $pts = array_map(fn ($p) => [$p[0] * $cos - $p[1] * $sin, $p[0] * $sin + $p[1] * $cos], $it['box'] ?: [[0, 0]]);
            $xs = array_column($pts, 0);
            $ys = array_column($pts, 1);
            $out[] = [
                'text' => $it['text'],
                'x1' => min($xs), 'x2' => max($xs), 'cx' => (min($xs) + max($xs)) / 2,
                'cy' => (min($ys) + max($ys)) / 2, 'h' => max(1.0, max($ys) - min($ys)),
            ];
        }

        return $out;
    }
}
