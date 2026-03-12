<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\VoteCastingService;
use Illuminate\Http\Request;
use RuntimeException;

class VoteController extends Controller
{
    private VoteCastingService $voteCastingService;
    private AuditLogService $auditLogService;

    public function __construct(
        VoteCastingService $voteCastingService,
        AuditLogService $auditLogService
    ) {
        $this->voteCastingService = $voteCastingService;
        $this->auditLogService = $auditLogService;
    }

    public function store(Request $request, $election)
    {
        $auth = $request->attributes->get('auth');

        if (!$auth || !isset($auth->sub)) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::with('voter')->find($auth->sub);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        $validated = $request->validate([
            'list_id' => ['required', 'integer'],
            'preferential_candidacy_id' => ['nullable', 'integer'],
        ]);

        $electionModel = Election::findOrFail((int) $election);

        try {
            $result = $this->voteCastingService->castVote(
                $user,
                $electionModel,
                (int) $validated['list_id'],
                isset($validated['preferential_candidacy_id'])
                    ? (int) $validated['preferential_candidacy_id']
                    : null
            );

            $this->auditLogService->log(
                $user,
                'vote.cast_success',
                [
                    'election_id' => $electionModel->id,
                    'voter_id' => $user->voter?->id,
                    'list_id' => (int) $validated['list_id'],
                    'receipt_hash' => $result['receipt']['receipt_hash'] ?? null,
                ],
                $request
            );

            return response()->json($result, 201);
        } catch (RuntimeException $e) {
            $this->auditLogService->log(
                $user,
                'vote.cast_failed',
                [
                    'election_id' => $electionModel->id,
                    'voter_id' => $user->voter?->id,
                    'list_id' => (int) $validated['list_id'],
                    'error' => $e->getMessage(),
                ],
                $request
            );

            return response()->json([
                'message' => $e->getMessage(),
            ], 409);
        }
    }
}