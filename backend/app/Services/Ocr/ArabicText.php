<?php

namespace App\Services\Ocr;

/** Normalisation for matching Arabic labels regardless of spelling variants and OCR noise. */
final class ArabicText
{
    public static function normalize(string $s): string
    {
        $s = preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $s) ?? $s; // tashkeel, tatweel
        $s = strtr($s, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ة' => 'ه', 'ى' => 'ي']);
        $s = preg_replace('/[:：\.\-_|]+/u', ' ', $s) ?? $s;

        return trim(preg_replace('/\s+/u', ' ', $s) ?? $s);
    }

    /** Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII. */
    public static function digits(string $s): string
    {
        $map = [];
        foreach (range(0, 9) as $d) {
            $map[mb_chr(0x0660 + $d)] = (string) $d;
            $map[mb_chr(0x06F0 + $d)] = (string) $d;
        }

        return strtr($s, $map);
    }

    /** Day/month/year in any order the documents use, to YYYY-MM-DD; '' when unreadable. */
    public static function date(string $s): string
    {
        $n = preg_replace('/\s+/u', '', self::digits($s)) ?? '';
        if (preg_match('/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/', $n, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
        }
        if (preg_match('/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/', $n, $m) && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
            return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
        }

        return '';
    }
}
