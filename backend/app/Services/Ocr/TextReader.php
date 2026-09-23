<?php

namespace App\Services\Ocr;

/**
 * Reads the text of one document image. Implemented by Google Cloud Vision
 * in production and by a recorded-response fake in tests.
 */
interface TextReader
{
    public function read(string $imagePath): OcrPage;
}
