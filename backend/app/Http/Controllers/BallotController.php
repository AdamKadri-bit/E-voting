<?php

namespace App\Http\Controllers;

use App\Exceptions\VotingException;
use App\Models\Election;
use App\Models\User;
use App\Services\E2e\BallotCastService;
use App\Services\Geo\Countries;
use Illuminate\Http\Request;

/**
 * Serves a voter's ballot: the frozen manifest (lists and candidates), the
 * election public key and the voter's pseudonymous credential — everything the
 * browser needs to encrypt locally. Resident and diaspora voters get the same
 * home-district ballot; the response says which path the voter is on.
 */
class BallotController extends Controller
{
    public function __construct(private BallotCastService $ballots, private Countries $countries)
    {
    }

    public function show(Request $request, Election $election)
    {
        $user = User::with('voter')->find($request->attributes->get('auth')->sub ?? null);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 401);
        }

        try {
            $e2e = $this->ballots->ballotFor($user, $election);
        } catch (VotingException $e) {
            return response()->json(['message' => $e->getMessage(), 'reason' => $e->reason], $e->status);
        }

        return response()->json([
            'election' => [
                'id' => $election->id,
                'title' => $election->title,
                'ends_at' => $election->ends_at?->toISOString(),
                'diaspora_voting_enabled' => (bool) $election->diaspora_voting_enabled,
            ],
            'constituency' => $e2e['constituency'],
            'district' => $e2e['district'],
            'voter' => [
                'name' => trim(($user->voter->first_name ?? '') . ' ' . ($user->voter->last_name ?? '')) ?: $user->name,
                'voter_type' => $user->voter_type,
                'residence_country' => $user->residence_country,
                'residence_country_name' => $this->countries->name($user->residence_country),
            ],
            'e2e' => [
                'manifest' => $e2e['manifest'],
                'joint_public_key' => $e2e['joint_public_key'],
                'credential' => $e2e['credential'],
                'has_voted' => $e2e['has_voted'],
            ],
        ]);
    }
}
