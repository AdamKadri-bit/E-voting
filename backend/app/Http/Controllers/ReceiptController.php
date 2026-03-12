<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\ReceiptService;
use Illuminate\Http\Request;
use RuntimeException;

class ReceiptController extends Controller
{
    private ReceiptService $receiptService;
    private AuditLogService $auditLogService;

    public function __construct(
        ReceiptService $receiptService,
        AuditLogService $auditLogService
    ) {
        $this->receiptService = $receiptService;
        $this->auditLogService = $auditLogService;
    }

    public function show(Request $request, string $receiptHash)
    {
        try {
            $result = $this->receiptService->verifyReceipt($receiptHash);

            $this->auditLogService->log(
                null,
                'receipt.verified',
                [
                    'receipt_hash' => $receiptHash,
                    'election_id' => $result['election']['id'] ?? null,
                ],
                $request
            );

            return response()->json($result, 200);
        } catch (RuntimeException $e) {
            $this->auditLogService->log(
                null,
                'receipt.verify_failed',
                [
                    'receipt_hash' => $receiptHash,
                    'error' => $e->getMessage(),
                ],
                $request
            );

            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        }
    }
}