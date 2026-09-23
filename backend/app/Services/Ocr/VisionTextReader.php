<?php

namespace App\Services\Ocr;

use App\Services\LebaneseIdOcrService;
use Google\Cloud\Vision\V1\ImageAnnotatorClient;
use RuntimeException;

/**
 * Google Cloud Vision DOCUMENT_TEXT_DETECTION: returns the text plus every
 * paragraph's bounding polygon. Credentials are resolved exactly as for the
 * national-ID scan (key file or application-default login).
 */
class VisionTextReader implements TextReader
{
    public function read(string $imagePath): OcrPage
    {
        if (!LebaneseIdOcrService::isConfigured()) {
            throw new RuntimeException('Google Cloud Vision has no credentials on this machine. Run `php artisan ocr:check`.');
        }

        $content = file_get_contents($imagePath);
        if ($content === false) {
            throw new RuntimeException('Failed to read image file.');
        }

        $client = new ImageAnnotatorClient(LebaneseIdOcrService::clientOptions());

        try {
            $response = $client->documentTextDetection($content);
            if ($response->getError()) {
                throw new RuntimeException('Vision error: ' . $response->getError()->getMessage());
            }

            $full = $response->getFullTextAnnotation();
            if (!$full) {
                return new OcrPage('');
            }

            $items = [];
            foreach ($full->getPages() as $page) {
                foreach ($page->getBlocks() as $block) {
                    foreach ($block->getParagraphs() as $paragraph) {
                        $text = '';
                        foreach ($paragraph->getWords() as $word) {
                            foreach ($word->getSymbols() as $symbol) {
                                $text .= $symbol->getText();
                                $break = $symbol->getProperty()?->getDetectedBreak();
                                if ($break && in_array($break->getType(), [1, 2, 3, 5], true)) {
                                    $text .= ' ';
                                }
                            }
                        }
                        $box = [];
                        foreach ($paragraph->getBoundingBox()->getVertices() as $v) {
                            $box[] = [(float) $v->getX(), (float) $v->getY()];
                        }
                        $items[] = ['text' => trim($text), 'box' => $box];
                    }
                }
            }

            return new OcrPage($full->getText(), $items);
        } finally {
            $client->close();
        }
    }
}
