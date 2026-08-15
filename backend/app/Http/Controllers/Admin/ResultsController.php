<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Election;
use App\Services\BallotTallyService;
use App\Services\ChainVerificationService;
use App\Services\GeoResultsService;
use Illuminate\Http\Request;

class ResultsController extends Controller
{
    /** Per-list / per-candidate tally + turnout for one election. */
    public function results(Election $election, BallotTallyService $tally)
    {
        Election::autoCloseExpired();
        $election->refresh();

        return response()->json($tally->tally($election));
    }

    /** Same results, split by governorate and constituency, for the map. */
    public function geoResults(Election $election, GeoResultsService $geo)
    {
        Election::autoCloseExpired();
        $election->refresh();

        return response()->json($geo->breakdown($election));
    }

    /** Ballots-cast-over-time, bucketed across the voting window. */
    public function turnoutTimeline(Request $request, Election $election, BallotTallyService $tally)
    {
        $buckets = (int) $request->query('buckets', 24);

        return response()->json($tally->turnoutTimeline($election, $buckets));
    }

    /** Verify the tamper-evident ballot chain. */
    public function verifyChain(ChainVerificationService $chain)
    {
        return response()->json($chain->verifyBallotChain());
    }

    /** Paginated audit log (most recent first). */
    public function auditLogs(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        $logs = AuditLog::query()
            ->with('actor:id,name,email,role')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json($logs);
    }
}
