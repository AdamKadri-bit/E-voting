<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use Illuminate\Support\Facades\DB;

/**
 * Decides whether an election is complete enough to be opened for voting.
 *
 * An election that goes active with no lists, or with lists that carry no
 * candidates, would hand voters an empty ballot. Every check below has to
 * pass before `updateStatus()` will move an election to `active`.
 */
class ElectionReadinessService
{
    /**
     * @return array{ready: bool, blockers: string[], checks: array<int, array{key: string, label: string, passed: bool, detail: string}>}
     */
    public function evaluate(Election $election): array
    {
        $checks = [];

        // 1. Voting window.
        $hasWindow = $election->starts_at !== null && $election->ends_at !== null;
        $windowOrdered = $hasWindow && $election->ends_at->greaterThan($election->starts_at);
        $checks[] = [
            'key' => 'voting_window',
            'label' => 'Voting window set',
            'passed' => $windowOrdered,
            'detail' => $windowOrdered
                ? $election->starts_at->toDateTimeString() . ' → ' . $election->ends_at->toDateTimeString()
                : (!$hasWindow
                    ? 'Set a start and end time before activating this election.'
                    : 'The end time must come after the start time.'),
        ];

        // 2. At least one constituency, otherwise no ballot can be built.
        $constituencyIds = $election->constituencies()->pluck('constituencies.id');
        $checks[] = [
            'key' => 'constituencies',
            'label' => 'Constituencies attached',
            'passed' => $constituencyIds->isNotEmpty(),
            'detail' => $constituencyIds->isNotEmpty()
                ? $constituencyIds->count() . ' constituency/constituencies attached.'
                : 'Attach at least one constituency before activating.',
        ];

        // 3. At least one list overall.
        $lists = ElectionList::query()
            ->where('election_id', $election->id)
            ->where('is_withdrawn', false)
            ->get(['id', 'constituency_id', 'list_name_en', 'list_name']);

        $checks[] = [
            'key' => 'lists',
            'label' => 'Lists registered',
            'passed' => $lists->isNotEmpty(),
            'detail' => $lists->isNotEmpty()
                ? $lists->count() . ' list(s) registered.'
                : 'Register at least one list before activating.',
        ];

        // 4. Every attached constituency needs a list, or its voters get a
        //    ballot with nothing on it.
        $constituenciesWithLists = $lists->pluck('constituency_id')->unique();
        $emptyConstituencies = $constituencyIds->diff($constituenciesWithLists);
        $missingNames = $emptyConstituencies->isEmpty()
            ? collect()
            : DB::table('constituencies')
                ->whereIn('id', $emptyConstituencies)
                ->pluck('name_en');

        $checks[] = [
            'key' => 'lists_per_constituency',
            'label' => 'Every constituency has a list',
            'passed' => $constituencyIds->isNotEmpty() && $emptyConstituencies->isEmpty(),
            'detail' => $constituencyIds->isEmpty()
                ? 'No constituencies attached yet.'
                : ($emptyConstituencies->isEmpty()
                    ? 'All attached constituencies have at least one list.'
                    : 'No list in: ' . $this->nameList($missingNames)),
        ];

        // 5. Every list needs at least one accepted candidate on it. Members
        //    whose candidacy was rejected or withdrawn don't count — they
        //    never reach the ballot.
        $candidateCounts = DB::table('list_candidates')
            ->join('candidacies', 'candidacies.id', '=', 'list_candidates.candidacy_id')
            ->whereIn('list_candidates.list_id', $lists->pluck('id'))
            ->where('candidacies.status', 'accepted')
            ->select('list_candidates.list_id', DB::raw('COUNT(*) as total'))
            ->groupBy('list_candidates.list_id')
            ->pluck('total', 'list_id');

        $emptyLists = $lists->filter(fn ($list) => (int) ($candidateCounts[$list->id] ?? 0) === 0);

        $checks[] = [
            'key' => 'candidates_per_list',
            'label' => 'Every list has candidates',
            'passed' => $lists->isNotEmpty() && $emptyLists->isEmpty(),
            'detail' => $lists->isEmpty()
                ? 'No lists registered yet.'
                : ($emptyLists->isEmpty()
                    ? 'All lists have at least one accepted candidate.'
                    : 'No accepted candidates on: ' . $this->nameList($emptyLists
                        ->map(fn ($list) => $list->list_name_en ?? $list->list_name ?? "List #{$list->id}"))),
        ];

        // 6. At least one accepted candidacy in the election.
        $acceptedCandidacies = Candidacy::query()
            ->where('election_id', $election->id)
            ->where('status', 'accepted')
            ->count();

        $checks[] = [
            'key' => 'accepted_candidacies',
            'label' => 'Accepted candidacies',
            'passed' => $acceptedCandidacies > 0,
            'detail' => $acceptedCandidacies > 0
                ? $acceptedCandidacies . ' accepted candidacy/candidacies.'
                : 'Accept at least one candidacy before activating.',
        ];

        $blockers = collect($checks)
            ->reject(fn ($check) => $check['passed'])
            ->pluck('detail')
            ->values()
            ->all();

        return [
            'ready' => $blockers === [],
            'blockers' => $blockers,
            'checks' => $checks,
        ];
    }

    /**
     * Names a few offenders and counts the rest. An election with 139 lists
     * would otherwise produce a blocker message nobody can read.
     */
    private function nameList(\Illuminate\Support\Collection $names, int $limit = 5): string
    {
        $shown = $names->take($limit)->implode(', ');
        $remaining = $names->count() - $limit;

        return $remaining > 0
            ? "{$shown}, and {$remaining} more."
            : "{$shown}.";
    }
}
