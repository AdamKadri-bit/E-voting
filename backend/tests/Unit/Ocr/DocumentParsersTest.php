<?php

namespace Tests\Unit\Ocr;

use App\Services\Ocr\ArabicText;
use App\Services\Ocr\IkhrajQaydParser;
use App\Services\Ocr\OcrPage;
use App\Services\Ocr\PassportMrzParser;
use PHPUnit\Framework\TestCase;

/**
 * Parsers run on real Google Cloud Vision output recorded from FICTIONAL
 * specimen documents (tests/Fixtures/ocr) — a clean scan and a tilted,
 * blurred, JPEG-compressed "phone photo" of each.
 */
class DocumentParsersTest extends TestCase
{
    private function page(string $name): OcrPage
    {
        return OcrPage::fromArray(json_decode(file_get_contents(__DIR__ . "/../../Fixtures/ocr/{$name}.json"), true));
    }

    public function test_ikhraj_qayd_fields_are_paired_by_position_even_on_a_tilted_photo(): void
    {
        foreach (['ikhraj-clean', 'ikhraj-photo'] as $f) {
            $d = (new IkhrajQaydParser())->parse($this->page($f));
            $this->assertSame('رامي حداد', $d['full_name'], $f);
            $this->assertSame('جورج', $d['father_name'], $f);
            $this->assertSame('ماري خوري', $d['mother_name'], $f);
            $this->assertSame('1990-01-15', $d['date_of_birth'], $f);
            $this->assertSame('بيروت', $d['place_of_birth'], $f);
            $this->assertSame('247', $d['civil_registry_number'], $f);
            $this->assertSame('المتن', $d['district'], $f);
            $this->assertSame('بكفيا', $d['locality'], $f);
        }
    }

    public function test_ikhraj_qayd_never_extracts_religious_sect_or_marital_status(): void
    {
        $d = (new IkhrajQaydParser())->parse($this->page('ikhraj-photo'));
        $json = json_encode($d, JSON_UNESCAPED_UNICODE);
        $this->assertStringNotContainsString('أرثوذكس', $json);
        $this->assertStringNotContainsString('عازب', $json);
        $this->assertStringNotContainsString('ذكر', $json);
    }

    public function test_passport_mrz_is_read_and_validated_including_a_split_filler_line(): void
    {
        foreach (['passport-clean', 'passport-photo'] as $f) {
            $r = (new PassportMrzParser())->parse($this->page($f));
            $this->assertTrue($r['found'], $f);
            $this->assertTrue($r['mrz_valid'], $f);
            $this->assertSame('Rami Georges Haddad', $r['data']['full_name']);
            $this->assertSame('1990-01-15', $r['data']['date_of_birth']);
            $this->assertSame('RL1234567', $r['data']['passport_number']);
            $this->assertSame('LBN', $r['data']['nationality']);
            // This older-style specimen prints no parents' names.
            $this->assertSame('', $r['data']['father_name']);
        }
    }

    public function test_current_lebanese_passport_layout_gives_parents_and_registry_number(): void
    {
        $r = (new PassportMrzParser())->parse($this->page('passport-2page'));
        $this->assertTrue($r['mrz_valid']);
        $this->assertSame('Layal Nassar', $r['data']['full_name']);
        $this->assertSame('Samir', $r['data']['father_name']);
        $this->assertSame('Nawal Khalil', $r['data']['mother_name']);
        $this->assertSame('132', $r['data']['civil_registry_number']);
        $this->assertSame('Zahle', $r['data']['place_of_birth']);
        $this->assertSame('1995-12-03', $r['data']['date_of_birth']);
    }

    public function test_one_letter_ocr_debris_is_not_kept_in_names(): void
    {
        // "Place of birth/J BEIRUT": the Arabic colon was misread as "J".
        $this->assertSame('Beirut', (new PassportMrzParser())->parse($this->page('passport-clean'))['data']['place_of_birth']);
    }

    public function test_misread_mrz_character_is_detected_by_check_digits(): void
    {
        $p = $this->page('passport-clean');
        $bad = new OcrPage(str_replace('9001158', '9001168', $p->text), $p->items);
        $r = (new PassportMrzParser())->parse($bad);
        $this->assertTrue($r['found']);
        $this->assertFalse($r['mrz_valid']);
    }

    public function test_icao_9303_check_digit_reference_values(): void
    {
        // ICAO Doc 9303 Part 3 worked example (specimen "L898902C3", 12 Aug 1974, expiry 15 Apr 2012).
        $this->assertSame('6', PassportMrzParser::check('L898902C3'));
        $this->assertSame('2', PassportMrzParser::check('740812'));
        $this->assertSame('9', PassportMrzParser::check('120415'));
    }

    public function test_page_without_an_mrz_is_reported_not_guessed(): void
    {
        $r = (new PassportMrzParser())->parse(new OcrPage("just a photo\nof something"));
        $this->assertFalse($r['found']);
        $this->assertSame('', $r['data']['full_name']);
    }

    public function test_arabic_digits_and_dates(): void
    {
        $this->assertSame('1990', ArabicText::digits('١٩٩٠'));
        $this->assertSame('2026', ArabicText::digits('۲۰۲۶'));
        $this->assertSame('1990-01-15', ArabicText::date('١٥/١/١٩٩٠'));
        $this->assertSame('1990-01-15', ArabicText::date('1990/01/15'));
        $this->assertSame('', ArabicText::date('32/13/1990'));
        $this->assertSame('اسم الام وشهرتها', ArabicText::normalize('اسمُ الأمّ وشهرتها:'));
    }
}
