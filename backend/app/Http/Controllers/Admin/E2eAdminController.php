<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\VotingException;
use App\Http\Controllers\Controller;
use App\Models\Election;
use App\Models\User;
use App\Services\E2e\BoardVerifier;
use App\Services\E2e\BulletinBoardService;
use App\Services\E2e\KeyCeremonyService;
use App\Services\E2e\TallyService;
use App\Services\ParticipationAnalyticsService;
use App\Services\Reports\ElectionReportService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/** Admin side of trustees, tallying, participation analytics and the report. */
class E2eAdminController extends Controller
{
    public function __construct(private KeyCeremonyService $ceremony, private TallyService $tally)
    {
    }

    private function wrap(callable $fn)
    {
        try {
            return $fn();
        } catch (VotingException $e) {
            return response()->json(['message' => $e->getMessage(), 'reason' => $e->reason], $e->status);
        }
    }

    /** Verified accounts that can be made trustees, searchable by name/email. */
    public function trusteeCandidates(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        return response()->json(['users' => User::query()
            ->whereNotNull('email_verified_at')
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('email', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%")))
            ->orderByRaw("CASE WHEN role = 'admin' THEN 0 ELSE 1 END")->orderBy('name')
            ->limit(25)->get(['id', 'name', 'email', 'role'])]);
    }

    public function ceremony(Election $election)
    {
        return response()->json($this->ceremony->publicState($election));
    }

    public function assignTrustees(Request $request, Election $election)
    {
        $data = $request->validate([
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'exists:users,id'],
            'threshold' => ['required', 'integer', 'min:1'],
        ]);

        return $this->wrap(function () use ($request, $election, $data) {
            $this->ceremony->assign($election, $data['user_ids'], (int) $data['threshold'], $request->attributes->get('admin_user'));

            return response()->json($this->ceremony->publicState($election->fresh()));
        });
    }

    public function resetCeremony(Request $request, Election $election)
    {
        return $this->wrap(function () use ($request, $election) {
            $this->ceremony->reset($election, $request->attributes->get('admin_user'));

            return response()->json($this->ceremony->publicState($election->fresh()));
        });
    }

    public function startTally(Election $election)
    {
        return $this->wrap(function () use ($election) {
            $n = $this->tally->aggregate($election);

            return response()->json(['ok' => true, 'totals' => $n, 'tally_status' => $election->fresh()->tally_status]);
        });
    }

    public function participation(Request $request, Election $election, ParticipationAnalyticsService $analytics)
    {
        Election::autoCloseExpired();

        return response()->json($analytics->turnout($election->fresh(), true, (string) $request->query('mode', 'declared')));
    }

    public function verify(Election $election, BulletinBoardService $board, BoardVerifier $verifier)
    {
        abort_unless($election->isE2e(), 404);

        return response()->json($verifier->verify($board->export($election)));
    }

    public function report(Election $election, ElectionReportService $reports)
    {
        $book = $reports->build($election);

        return response()->streamDownload(function () use ($book) {
            (new Xlsx($book))->save('php://output');
        }, $reports->filename($election), [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
