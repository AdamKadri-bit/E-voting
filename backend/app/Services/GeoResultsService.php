<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ElectoralRollEntry;
use App\Models\EncryptedBallot;
use App\Models\Governorate;
use App\Models\VoterElectionStatus;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Breaks an election's results down by geography — governorate, and the
 * constituencies inside it — so the admin map can colour each region and
 * show its figures on hover.
 *
 * Ballots carry a constituency but no voter identity, so this aggregates
 * per constituency and rolls those totals up to the governorate its
 * districts belong to. Vote secrecy is unaffected: the smallest unit
 * reported here is a whole constituency.
 */
class GeoResultsService
{
    public function breakdown(Election $election): array
    {
        $constituencyIds = $election->constituencies()->pluck('constituencies.id');

        $tallies = $this->talliesByConstituency($election);
        $registered = $this->registeredByConstituency($election);
        $voted = $this->votedByConstituency($election);
        $registeredByGovernorate = $this->registeredByGovernorate($election);
        $votedByGovernorate = $this->votedByGovernorate($election);
        $sharedDistrictConstituencies = $this->constituenciesOnSharedDistricts();
        $listNames = $this->listNames($election);
        $candidateNames = $this->candidateNames($election);
        $seatsByConstituency = $this->seatsByConstituency($election);

        $governorates = Governorate::query()
            ->with(['districts:id,governorate_id,name_en,name_ar,code'])
            ->orderBy('id')
            ->get();

        // constituency_id => governorate_id, via the districts it covers.
        $constituencyGovernorate = DB::table('constituency_districts')
            ->join('districts', 'districts.id', '=', 'constituency_districts.district_id')
            ->select('constituency_districts.constituency_id', 'districts.governorate_id')
            ->distinct()
            ->get()
            ->groupBy('constituency_id')
            ->map(fn ($rows) => (int) $rows->first()->governorate_id);

        $constituencies = DB::table('constituencies')
            ->whereIn('id', $constituencyIds)
            ->orderBy('name_en')
            ->get(['id', 'name_en', 'name_ar', 'code']);

        $byGovernorate = [];

        foreach ($constituencies as $constituency) {
            $id = (int) $constituency->id;
            $tally = $tallies[$id] ?? ['ballots' => 0, 'lists' => [], 'candidates' => []];

            // Where several constituencies share a district (Beirut I and II
            // both cover the Beirut district), the roll records the district
            // only — it can't say which constituency a voter belongs to. Those
            // headcounts are reported as unattributable rather than guessed at,
            // and the governorate figures come from the roll directly.
            $attributable = !in_array($id, $sharedDistrictConstituencies, true);
            $reg = $attributable ? (int) ($registered[$id] ?? 0) : null;
            $vot = $attributable ? (int) ($voted[$id] ?? 0) : null;

            $lists = collect($tally['lists'])
                ->map(fn ($votes, $listId) => [
                    'list_id' => (int) $listId,
                    'list_name' => $listNames[$listId] ?? "List #{$listId}",
                    'votes' => $votes,
                    'percentage' => $tally['ballots'] > 0
                        ? round(($votes / $tally['ballots']) * 100, 1)
                        : 0.0,
                ])
                ->sortByDesc('votes')
                ->values()
                ->all();

            $candidates = collect($tally['candidates'])
                ->map(fn ($votes, $candId) => [
                    'candidacy_id' => (int) $candId,
                    'candidate_name' => $candidateNames[$candId] ?? "Candidacy #{$candId}",
                    'votes' => $votes,
                    'percentage' => $tally['ballots'] > 0
                        ? round(($votes / $tally['ballots']) * 100, 1)
                        : 0.0,
                ])
                ->sortByDesc('votes')
                ->values()
                ->all();

            $governorateId = $constituencyGovernorate[$id] ?? null;

            $byGovernorate[$governorateId][] = [
                'id' => $id,
                'code' => $constituency->code,
                'name_en' => $constituency->name_en,
                'name_ar' => $constituency->name_ar,
                'seats' => (int) ($seatsByConstituency[$id] ?? 0),
                'registration_attributable' => $attributable,
                'registered' => $reg,
                'voted' => $vot,
                'ballots' => $tally['ballots'],
                'turnout_percentage' => match (true) {
                    !$attributable => null,
                    $reg > 0 => round(($vot / $reg) * 100, 1),
                    default => 0.0,
                },
                'lists' => $lists,
                'preferential_candidates' => $candidates,
            ];
        }

        $governorateRows = [];
        $totals = ['registered' => 0, 'voted' => 0, 'ballots' => 0];

        foreach ($governorates as $governorate) {
            $rows = $byGovernorate[$governorate->id] ?? [];

            // Straight off the roll, so a district shared by two constituencies
            // is never counted twice.
            $reg = (int) ($registeredByGovernorate[$governorate->id] ?? 0);
            $vot = (int) ($votedByGovernorate[$governorate->id] ?? 0);
            $bal = array_sum(array_column($rows, 'ballots'));

            $totals['registered'] += $reg;
            $totals['voted'] += $vot;
            $totals['ballots'] += $bal;

            // Roll the per-constituency list totals up to the governorate.
            $listTotals = [];
            $candidateTotals = [];
            foreach ($rows as $row) {
                foreach ($row['lists'] as $list) {
                    $listTotals[$list['list_name']] = ($listTotals[$list['list_name']] ?? 0) + $list['votes'];
                }
                foreach ($row['preferential_candidates'] as $candidate) {
                    $candidateTotals[$candidate['candidate_name']] =
                        ($candidateTotals[$candidate['candidate_name']] ?? 0) + $candidate['votes'];
                }
            }
            arsort($listTotals);
            arsort($candidateTotals);

            $governorateRows[] = [
                'id' => $governorate->id,
                'code' => $governorate->code,
                'name_en' => $governorate->name_en,
                'name_ar' => $governorate->name_ar,
                'districts' => $governorate->districts
                    ->map(fn ($d) => ['id' => $d->id, 'code' => $d->code, 'name_en' => $d->name_en, 'name_ar' => $d->name_ar])
                    ->values()
                    ->all(),
                'in_election' => $rows !== [],
                'registered' => $reg,
                'voted' => $vot,
                'ballots' => $bal,
                'turnout_percentage' => $reg > 0 ? round(($vot / $reg) * 100, 1) : 0.0,
                'lists' => collect($listTotals)
                    ->map(fn ($votes, $name) => [
                        'list_name' => $name,
                        'votes' => $votes,
                        'percentage' => $bal > 0 ? round(($votes / $bal) * 100, 1) : 0.0,
                    ])
                    ->values()
                    ->all(),
                'preferential_candidates' => collect($candidateTotals)
                    ->take(10)
                    ->map(fn ($votes, $name) => [
                        'candidate_name' => $name,
                        'votes' => $votes,
                        'percentage' => $bal > 0 ? round(($votes / $bal) * 100, 1) : 0.0,
                    ])
                    ->values()
                    ->all(),
                'constituencies' => $rows,
            ];
        }

        return [
            'election' => [
                'id' => $election->id,
                'title' => $election->title,
                'status' => $election->status,
                'starts_at' => $election->starts_at,
                'ends_at' => $election->ends_at,
            ],
            'totals' => array_merge($totals, [
                'turnout_percentage' => $totals['registered'] > 0
                    ? round(($totals['voted'] / $totals['registered']) * 100, 1)
                    : 0.0,
            ]),
            'governorates' => $governorateRows,
        ];
    }

    /**
     * Decrypts this election's ballots once and buckets list and
     * preferential-candidate votes by the constituency the ballot was cast in.
     *
     * @return array<int, array{ballots: int, lists: array<int,int>, candidates: array<int,int>}>
     */
    private function talliesByConstituency(Election $election): array
    {
        $out = [];

        EncryptedBallot::query()
            ->where('election_id', $election->id)
            ->select(['constituency_id', 'encrypted_payload'])
            ->chunk(500, function ($ballots) use (&$out) {
                foreach ($ballots as $ballot) {
                    $constituencyId = (int) $ballot->constituency_id;
                    $out[$constituencyId] ??= ['ballots' => 0, 'lists' => [], 'candidates' => []];
                    $out[$constituencyId]['ballots']++;

                    try {
                        $payload = json_decode(Crypt::decrypt($ballot->encrypted_payload), true);
                    } catch (\Throwable $e) {
                        continue;
                    }

                    if (!is_array($payload)) {
                        continue;
                    }

                    $listId = $payload['list_id'] ?? null;
                    if ($listId !== null) {
                        $out[$constituencyId]['lists'][$listId] =
                            ($out[$constituencyId]['lists'][$listId] ?? 0) + 1;
                    }

                    $candId = $payload['preferential_candidacy_id'] ?? null;
                    if ($candId !== null) {
                        $out[$constituencyId]['candidates'][$candId] =
                            ($out[$constituencyId]['candidates'][$candId] ?? 0) + 1;
                    }
                }
            });

        return $out;
    }

    /** Electoral-roll headcount per constituency, via the districts it covers. */
    private function registeredByConstituency(Election $election): array
    {
        return ElectoralRollEntry::query()
            ->join(
                'constituency_districts',
                'constituency_districts.district_id',
                '=',
                'electoral_roll_entries.registered_district_id'
            )
            ->where('electoral_roll_entries.election_id', $election->id)
            ->select('constituency_districts.constituency_id', DB::raw('COUNT(*) as total'))
            ->groupBy('constituency_districts.constituency_id')
            ->pluck('total', 'constituency_id')
            ->all();
    }

    /**
     * Electoral-roll headcount per governorate, read off the roll's own
     * governorate column — the authoritative figure, since it can't
     * double-count a district that two constituencies share.
     */
    private function registeredByGovernorate(Election $election): array
    {
        return ElectoralRollEntry::query()
            ->where('election_id', $election->id)
            ->select('registered_governorate_id', DB::raw('COUNT(*) as total'))
            ->groupBy('registered_governorate_id')
            ->pluck('total', 'registered_governorate_id')
            ->all();
    }

    /** Voters marked as having voted, per governorate. */
    private function votedByGovernorate(Election $election): array
    {
        return VoterElectionStatus::query()
            ->join('voters', 'voters.id', '=', 'voter_election_status.voter_id')
            ->where('voter_election_status.election_id', $election->id)
            ->where('voter_election_status.has_voted', true)
            ->select('voters.registered_governorate_id', DB::raw('COUNT(*) as total'))
            ->groupBy('voters.registered_governorate_id')
            ->pluck('total', 'registered_governorate_id')
            ->all();
    }

    /**
     * Constituencies that cover a district shared with another constituency.
     * Their share of that district's voters can't be derived from the roll.
     *
     * @return int[]
     */
    private function constituenciesOnSharedDistricts(): array
    {
        $sharedDistricts = DB::table('constituency_districts')
            ->select('district_id')
            ->groupBy('district_id')
            ->havingRaw('COUNT(DISTINCT constituency_id) > 1')
            ->pluck('district_id');

        if ($sharedDistricts->isEmpty()) {
            return [];
        }

        return DB::table('constituency_districts')
            ->whereIn('district_id', $sharedDistricts)
            ->distinct()
            ->pluck('constituency_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** Voters marked as having voted, per constituency. */
    private function votedByConstituency(Election $election): array
    {
        return VoterElectionStatus::query()
            ->join('voters', 'voters.id', '=', 'voter_election_status.voter_id')
            ->join(
                'constituency_districts',
                'constituency_districts.district_id',
                '=',
                'voters.registered_district_id'
            )
            ->where('voter_election_status.election_id', $election->id)
            ->where('voter_election_status.has_voted', true)
            ->select('constituency_districts.constituency_id', DB::raw('COUNT(*) as total'))
            ->groupBy('constituency_districts.constituency_id')
            ->pluck('total', 'constituency_id')
            ->all();
    }

    private function listNames(Election $election): array
    {
        return ElectionList::query()
            ->where('election_id', $election->id)
            ->get(['id', 'list_name_en', 'list_name'])
            ->mapWithKeys(fn ($list) => [
                $list->id => $list->list_name_en ?: $list->list_name ?: "List #{$list->id}",
            ])
            ->all();
    }

    private function candidateNames(Election $election): array
    {
        return Candidacy::query()
            ->where('candidacies.election_id', $election->id)
            ->leftJoin('candidate_profiles', 'candidate_profiles.id', '=', 'candidacies.candidate_profile_id')
            ->get(['candidacies.id', 'candidate_profiles.full_name', 'candidate_profiles.full_name_ar'])
            ->mapWithKeys(fn ($row) => [
                $row->id => $row->full_name ?: $row->full_name_ar ?: "Candidacy #{$row->id}",
            ])
            ->all();
    }

    /** Seats allocated per constituency for this election, if seeded. */
    private function seatsByConstituency(Election $election): array
    {
        if (!DB::getSchemaBuilder()->hasTable('election_seats')) {
            return [];
        }

        return DB::table('election_seats')
            ->where('election_id', $election->id)
            ->select('constituency_id', DB::raw('SUM(seat_count) as total'))
            ->groupBy('constituency_id')
            ->pluck('total', 'constituency_id')
            ->all();
    }
}
