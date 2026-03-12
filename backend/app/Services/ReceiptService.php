<?php

namespace App\Services;

use App\Models\Receipt;
use RuntimeException;

class ReceiptService
{
    public function verifyReceipt(string $receiptHash): array
    {
        $receipt = Receipt::with('election')
            ->where('receipt_hash', $receiptHash)
            ->first();

        if (!$receipt) {
            throw new RuntimeException('Receipt not found.');
        }

        return [
            'message' => 'Receipt verified.',
            'receipt' => [
                'receipt_hash' => $receipt->receipt_hash,
                'issued_at' => $receipt->issued_at,
            ],
            'election' => [
                'id' => $receipt->election->id,
                'title' => $receipt->election->title,
                'status' => $receipt->election->status,
            ],
        ];
    }
}