<?php

namespace App\Http\Controllers;

use App\Services\ChainVerificationService;

class AuditChainController extends Controller
{
    private ChainVerificationService $chainVerificationService;

    public function __construct(ChainVerificationService $chainVerificationService)
    {
        $this->chainVerificationService = $chainVerificationService;
    }

    public function verifyBallots()
    {
        $result = $this->chainVerificationService->verifyBallotChain();

        return response()->json($result, $result['valid'] ? 200 : 409);
    }
}