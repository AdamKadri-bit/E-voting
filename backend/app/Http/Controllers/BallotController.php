<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\BallotService;
use Illuminate\Http\Request;
use RuntimeException;

class BallotController extends Controller
{
    private BallotService $ballotService;
    private AuditLogService $auditLogService;

    public function __construct(
        BallotService $ballotService,
        AuditLogService $auditLogService
    ) {
        $this->ballotService = $ballotService;
        $this->auditLogService = $auditLogService;
    }

    public function show(Request $request, $election)
    {
        $auth = $request->attributes->get('auth');

        if (!$auth || !isset($auth->sub)) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::with('voter')->find($auth->sub);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        $electionModel = Election::findOrFail((int) $election);

        try {
            $ballot = $this->ballotService->generateBallot($user, $electionModel);

            $this->auditLogService->log(
                $user,
                'ballot.viewed',
                [
                    'election_id' => $electionModel->id,
                    'voter_id' => $user->voter?->id,
                ],
                $request
            );

            return response()->json($ballot);
        } catch (RuntimeException $e) {
            $this->auditLogService->log(
                $user,
                'ballot.view_failed',
                [
                    'election_id' => $electionModel->id,
                    'error' => $e->getMessage(),
                ],
                $request
            );

            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}