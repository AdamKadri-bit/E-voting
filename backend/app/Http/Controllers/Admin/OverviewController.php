<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\EncryptedBallot;
use App\Models\User;
use App\Services\ChainVerificationService;

class OverviewController extends Controller
{
    public function index(ChainVerificationService $chain)
    {
        $chainResult = $chain->verifyBallotChain();

        return response()->json([
            'counts' => [
                'elections' => Election::count(),
                'active_elections' => Election::where('status', 'active')->count(),
                'lists' => ElectionList::count(),
                'candidacies' => Candidacy::count(),
                'ballots' => EncryptedBallot::count(),
                'voters' => User::where('role', 'voter')->count(),
            ],
            'chain' => [
                'valid' => $chainResult['valid'] ?? false,
                'verified_ballots' => $chainResult['verified_ballots'] ?? 0,
                'message' => $chainResult['message'] ?? null,
            ],
        ]);
    }
}
