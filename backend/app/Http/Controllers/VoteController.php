<?php

namespace App\Http\Controllers;

use App\Exceptions\VotingException;
use App\Models\Election;
use App\Models\User;
use App\Services\E2e\BallotCastService;
use Illuminate\Http\Request;

/**
 * Casting and auditing encrypted ballots.
 *
 * The old plaintext endpoint (POST /elections/{id}/vote with a list_id) is
 * retired: it let the server see every choice. It now answers 410 Gone.
 */
class VoteController extends Controller
{
    public function __construct(private BallotCastService $ballots)
    {
    }

    public function legacy()
    {
        return response()->json([
            'message' => 'Plaintext voting has been retired. Ballots are now encrypted in your browser — reload the ballot page.',
            'reason' => 'legacy_endpoint',
        ], 410);
    }

    public function cast(Request $request, Election $election)
    {
        $user = User::with('voter')->find($request->attributes->get('auth')->sub ?? null);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        $data = $request->validate([
            'ballot' => ['required', 'array'],
            'ballot.election_id' => ['required', 'integer'],
            'ballot.manifest_id' => ['required', 'integer'],
            'ballot.manifest_hash' => ['required', 'string', 'size:64'],
            'ballot.credential' => ['required', 'string', 'size:64'],
            'ballot.ciphertexts' => ['required', 'array', 'max:400'],
            'ballot.option_proofs' => ['required', 'array', 'max:400'],
            'ballot.constraint_proofs' => ['required', 'array', 'max:400'],
        ]);

        try {
            // The IP is used once, for an offline country lookup, and then dropped.
            $result = $this->ballots->cast($user, $election, $data['ballot'], $request->ip());
        } catch (VotingException $e) {
            return response()->json(['message' => $e->getMessage(), 'reason' => $e->reason], $e->status);
        }

        return response()->json($result, 201);
    }

    /** Publishes a spoiled ballot. The frontend calls this without cookies, so it is not linked to a voter. */
    public function audit(Request $request, Election $election)
    {
        $data = $request->validate([
            'audit' => ['required', 'array'],
            'audit.manifest_id' => ['required', 'integer'],
            'audit.manifest_hash' => ['required', 'string', 'size:64'],
            'audit.ciphertexts' => ['required', 'array', 'max:400'],
            'audit.selections' => ['required', 'array', 'max:400'],
            'audit.randomness' => ['required', 'array', 'max:400'],
        ]);

        try {
            return response()->json($this->ballots->publishAudit($election, $data['audit']), 201);
        } catch (VotingException $e) {
            return response()->json(['message' => $e->getMessage(), 'reason' => $e->reason], $e->status);
        }
    }
}
