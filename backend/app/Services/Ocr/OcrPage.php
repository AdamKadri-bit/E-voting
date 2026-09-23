<?php

namespace App\Services\Ocr;

/**
 * OCR output of one image: the full text in reading order, plus every
 * paragraph with its bounding polygon so fields laid out in tables (where the
 * reading order separates a label from its value) can be paired by position.
 */
final class OcrPage
{
    /**
     * @param array<int, array{text: string, box: array<int, array{0: float, 1: float}>}> $items
     */
    public function __construct(public readonly string $text, public readonly array $items = [])
    {
    }

    public function toArray(): array
    {
        return ['text' => $this->text, 'items' => $this->items];
    }

    public static function fromArray(array $a): self
    {
        return new self((string) ($a['text'] ?? ''), $a['items'] ?? []);
    }
}
