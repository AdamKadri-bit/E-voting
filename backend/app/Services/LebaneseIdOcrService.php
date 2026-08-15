<?php

namespace App\Services;

use Google\Cloud\Vision\V1\ImageAnnotatorClient;

class LebaneseIdOcrService
{
    /**
     * Where this machine keeps its Google Cloud service-account key. The file
     * is never committed, so each developer points at their own copy — set
     * GOOGLE_APPLICATION_CREDENTIALS to move it off the default path.
     */
    public static function credentialsPath(): string
    {
        return (string) config('services.google_vision.credentials');
    }

    /**
     * Where `gcloud auth application-default login` leaves its credentials.
     *
     * This is the second way in, and the better one for a developer working
     * against someone else's project: the login happens in their own browser
     * and leaves no long-lived private key lying around to leak or commit.
     */
    public static function adcPath(): string
    {
        $home = getenv('HOME') ?: (getenv('USERPROFILE') ?: '');

        return $home === '' ? '' : $home . '/.config/gcloud/application_default_credentials.json';
    }

    /** Which mechanism this machine will authenticate with, if any. */
    public static function credentialSource(): ?string
    {
        $key = self::credentialsPath();

        if ($key !== '' && is_readable($key)) {
            return 'service_account_key';
        }

        $adc = self::adcPath();

        if ($adc !== '' && is_readable($adc)) {
            return 'application_default';
        }

        return null;
    }

    /** Whether this machine can run an OCR scan at all. */
    public static function isConfigured(): bool
    {
        return self::credentialSource() !== null;
    }

    /**
     * Options for the Vision client. A key file is passed explicitly; with
     * application-default credentials the option is left out entirely so the
     * library resolves them itself.
     */
    public static function clientOptions(): array
    {
        return self::credentialSource() === 'service_account_key'
            ? ['credentials' => self::credentialsPath()]
            : [];
    }

    public function extractFromImages(string $frontImagePath, string $backImagePath): array
    {
        if (!self::isConfigured()) {
            throw new \RuntimeException(
                'Google Cloud Vision has no credentials on this machine: no key file at '
                . self::credentialsPath() . ' and no application-default login. '
                . 'Run `php artisan ocr:check` for setup steps.'
            );
        }

        $frontText = $this->detectText($frontImagePath);
        $backText = $this->detectText($backImagePath);

        $firstName = $this->extractField($frontText, ['الاسم']);
        $lastName = $this->extractField($frontText, ['الشهرة']);
        $fatherName = $this->extractField($frontText, ['اسم الاب', 'اسم الأب']);
        $motherName = $this->extractField($frontText, ['اسم الام', 'اسم الأم']);
        $birthDateRaw = $this->extractField($frontText, ['تاريخ الولادة', 'تاريخ الولاده']);
        $placeOfBirth = $this->extractField($frontText, ['محل الولادة', 'محل الولاده', 'مكان الولادة', 'مكان الولاده']);

        $nationalIdNumber = $this->extractNationalIdNumber($frontText);
        $registryNumber = $this->extractRegistryNumber($backText);

        $data = [
            'full_name' => trim("$firstName $lastName"),
            'father_name' => $fatherName,
            'mother_name' => $motherName,
            'date_of_birth' => $this->parseDate($birthDateRaw),
            'place_of_birth' => $placeOfBirth,
            'national_id_number' => $nationalIdNumber,
            'civil_registry_number' => $registryNumber,
            'governorate' => $this->extractField($backText, ['المحافظة', 'المحافظه', 'محافظة', 'محافظه']),
            'district' => $this->extractField($backText, ['القضاء', 'قضاء']),
            'locality' => $this->extractField($backText, ['القرية', 'القريه', 'قرية', 'قريه']),
        ];

        // Raw OCR text reproduces the full contents of the ID card, so it is only
        // exposed in local/debug environments and never in production responses.
        if (config('app.debug')) {
            $data['ocr_debug'] = [
                'front_text' => $frontText,
                'back_text' => $backText,
            ];
        }

        return $data;
    }

    private function detectText(string $path): string
    {
        $client = new ImageAnnotatorClient(self::clientOptions());

        try {
            $content = file_get_contents($path);

            if ($content === false) {
                throw new \RuntimeException('Failed to read image file.');
            }

            $response = $client->textDetection($content);
            $texts = $response->getTextAnnotations();

            if (count($texts) === 0) {
                return '';
            }

            return $texts[0]->getDescription();
        } finally {
            $client->close();
        }
    }

    private function extractField(string $text, array $labels): string
    {
        foreach ($labels as $label) {
            $pattern = '/' . preg_quote($label, '/') . '\s*[:：]?\s*([^\n]+)/u';

            if (preg_match($pattern, $text, $matches)) {
                $value = trim($matches[1]);

                $value = preg_replace('/وشهرتها\s*[:：]?/u', '', $value);
                $value = preg_replace(
                    '/(الاسم|الشهرة|اسم الاب|اسم الأب|اسم الام|اسم الأم|محل الولادة|محل الولاده|مكان الولادة|مكان الولاده|تاريخ الولادة|تاريخ الولاده|المحافظة|المحافظه|القضاء|القرية|القريه|رقم السجل)\s*[:：]?.*$/u',
                    '',
                    $value
                );

                return trim($value);
            }
        }

        return '';
    }

    private function convertArabicDigitsToEnglish(string $value): string
    {
        return strtr($value, [
            '٠' => '0',
            '١' => '1',
            '٢' => '2',
            '٣' => '3',
            '٤' => '4',
            '٥' => '5',
            '٦' => '6',
            '٧' => '7',
            '٨' => '8',
            '٩' => '9',
            '۰' => '0',
            '۱' => '1',
            '۲' => '2',
            '۳' => '3',
            '۴' => '4',
            '۵' => '5',
            '۶' => '6',
            '۷' => '7',
            '۸' => '8',
            '۹' => '9',
        ]);
    }

    private function parseDate(string $value): string
    {
        $normalized = $this->convertArabicDigitsToEnglish($value);
        $normalized = preg_replace('/\s+/u', '', $normalized);

        if (preg_match('/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/', $normalized, $matches)) {
            return sprintf('%04d-%02d-%02d', (int) $matches[1], (int) $matches[2], (int) $matches[3]);
        }

        if (preg_match('/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/', $normalized, $matches)) {
            return sprintf('%04d-%02d-%02d', (int) $matches[3], (int) $matches[2], (int) $matches[1]);
        }

        return $normalized;
    }

    private function extractRegistryNumber(string $text): string
    {
        $normalized = $this->convertArabicDigitsToEnglish($text);

        if (preg_match('/رقم\s*السجل\s*[:：]?\s*([0-9]+)/u', $normalized, $matches)) {
            return trim($matches[1]);
        }

        $lines = preg_split('/\R/u', $normalized) ?: [];

        foreach ($lines as $line) {
            if (mb_strpos($line, 'رقم') !== false && mb_strpos($line, 'السجل') !== false) {
                if (preg_match('/([0-9]+)/u', $line, $matches)) {
                    return trim($matches[1]);
                }
            }
        }

        return '';
    }

    private function extractNationalIdNumber(string $text): string
    {
        $normalized = $this->convertArabicDigitsToEnglish($text);

        $labels = [
            'رقم الهوية',
            'رقم الهويه',
            'رقم بطاقة الهوية',
            'رقم بطاقة الهويه',
        ];

        foreach ($labels as $label) {
            if (preg_match('/' . preg_quote($label, '/') . '\s*[:：]?\s*([0-9]+)/u', $normalized, $matches)) {
                return trim($matches[1]);
            }
        }

        $lines = preg_split('/\R/u', $normalized) ?: [];

        foreach ($lines as $index => $line) {
            if (mb_strpos($line, 'بطاقة هوية') !== false || mb_strpos($line, 'بطاقة هويه') !== false) {
                for ($i = $index - 1; $i >= max(0, $index - 3); $i--) {
                    if (preg_match('/([0-9]{4,12})/u', $lines[$i], $matches)) {
                        return trim($matches[1]);
                    }
                }
            }
        }

        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $line = $lines[$i];

            if (
                mb_strpos($line, 'تاريخ') !== false ||
                mb_strpos($line, 'ولادة') !== false ||
                mb_strpos($line, 'الولاده') !== false ||
                mb_strpos($line, 'السجل') !== false
            ) {
                continue;
            }

            if (preg_match('/([0-9]{4,12})/u', $line, $matches)) {
                return trim($matches[1]);
            }
        }

        return '';
    }
}