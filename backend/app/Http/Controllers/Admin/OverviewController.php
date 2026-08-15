<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ElectoralRollEntry;
use App\Models\EncryptedBallot;
use App\Models\VoterElectionStatus;
use App\Services\ChainVerificationService;
use App\Services\ElectionLawService;
use App\Services\ElectionReadinessService;
use Illuminate\Support\Facades\DB;

class OverviewController extends Controller
{
    public function __construct(
        private ElectionReadinessService $readiness,
        private ElectionLawService $law,
    ) {
    }

    /**
     * The overview is election-scoped: this returns only the list of
     * elections to pick from. The figures for one election come from
     * show() once the admin selects it.
     */
    public function index()
    {
        Election::autoCloseExpired();

        $elections = Election::query()
            ->withCount(['lists', 'constituencies', 'encryptedBallots'])
            ->orderByDesc('starts_at')
            ->get([
                'id', 'title', 'type', 'law_ref', 'status', 'starts_at', 'ends_at',
            ]);

        return response()->json(['elections' => $elections]);
    }

    /** Everything the overview shows for one selected election. */
    public function show(Election $election, ChainVerificationService $chain)
    {
        Election::autoCloseExpired();
        $election->refresh();

        $chainResult = $chain->verifyBallotChain();

        $registered = ElectoralRollEntry::where('election_id', $election->id)->count();
        $voted = VoterElectionStatus::where('election_id', $election->id)
            ->where('has_voted', true)
            ->count();
        $ballots = EncryptedBallot::where('election_id', $election->id)->count();

        $candidaciesByStatus = Candidacy::query()
            ->where('election_id', $election->id)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $election->load('constituencies:id,name_en,name_ar,code');

        return response()->json([
            'election' => array_merge($election->toArray(), [
                'statutory_ends_at' => $this->law->statutoryEndFor($election)?->toISOString(),
                'statutory_law_ref' => $this->law->lawRef($election->type),
            ]),
            'counts' => [
                'constituencies' => $election->constituencies->count(),
                'lists' => ElectionList::where('election_id', $election->id)->count(),
                'candidacies' => (int) $candidaciesByStatus->sum(),
                'candidacies_accepted' => (int) ($candidaciesByStatus['accepted'] ?? 0),
                'candidacies_pending' => (int) ($candidaciesByStatus['pending'] ?? 0),
                'ballots' => $ballots,
                'registered_voters' => $registered,
            ],
            'turnout' => [
                'registered' => $registered,
                'voted' => $voted,
                'ballots_recorded' => $ballots,
                'turnout_percentage' => $registered > 0
                    ? round(($voted / $registered) * 100, 1)
                    : 0.0,
            ],
            'readiness' => $this->readiness->evaluate($election),
            'chain' => [
                'valid' => $chainResult['valid'] ?? false,
                'verified_ballots' => $chainResult['verified_ballots'] ?? 0,
                'message' => $chainResult['message'] ?? null,
            ],
        ]);
    }
}
