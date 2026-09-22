<?php

namespace App\Http\Controllers;

use App\Models\Election;
use App\Services\E2e\BulletinBoardService;
use App\Services\ParticipationAnalyticsService;
use Illuminate\Http\Request;

/**
 * Public, unauthenticated read-only endpoints: the bulletin board, its full
 * export for the verifier, and live turnout. None of them expose a voter
 * identity, a vote choice, or a ballot time.
 */
class BulletinBoardController extends Controller
{
    public function __construct(private BulletinBoardService $board)
    {
    }

    public function elections()
    {
        Election::autoCloseExpired();

        return response()->json([
            'elections' => Election::query()
                ->where('crypto_scheme', 'e2e')
                ->where(fn ($q) => $q->where('status', '!=', 'draft')->orWhere('key_ceremony_status', '!=', 'pending'))
                ->orderByDesc('starts_at')
                ->get()
                ->map(fn ($e) => $this->board->electionHeader($e)),
        ]);
    }

    public function show(Election $election)
    {
        abort_unless($election->isE2e(), 404);

        return response()->json($this->board->summary($election));
    }

    public function ballots(Request $request, Election $election)
    {
        abort_unless($election->isE2e(), 404);
        $kind = $request->query('kind') === 'audited' ? 'audited' : 'cast';

        return response()->json($this->board->page($election, $request->query('q'), (int) $request->query('per_page', 25), $kind));
    }

    public function lookup(Election $election, string $code)
    {
        abort_unless($election->isE2e(), 404);
        $row = $this->board->lookup($election, $code);

        return $row
            ? response()->json($row)
            : response()->json(['message' => 'No ballot with that tracking code is on this board.'], 404);
    }

    public function export(Election $election)
    {
        abort_unless($election->isE2e(), 404);

        return response()->json($this->board->export($election))
            ->header('Cache-Control', 'no-store');
    }

    /** Live turnout + map. Results are never part of this response. */
    public function turnout(Request $request, Election $election, ParticipationAnalyticsService $analytics)
    {
        Election::autoCloseExpired();

        return response()->json($analytics->turnout($election->fresh(), false, (string) $request->query('mode', 'declared')));
    }
}
