<?php

namespace App\Services;

use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\EncryptedBallot;
use App\Models\ElectoralRollEntry;
use App\Models\VoterElectionStatus;
use Illuminate\Support\Facades\Crypt;

/**
 * Produces results for an election by decrypting the stored ballots and
 * counting votes per list and per preferential candidate.
 *
 * Ballots hold no voter identity, so tallying preserves vote secrecy while
 * still allowing an authorized admin to compute totals.
 */
class BallotTallyService
{
    public function tally(Election $election): array
    {
        $ballots = EncryptedBallot::query()
            ->where('election_id', $election->id)
            ->get();

        $perList = [];        // list_id => count
        $perCandidate = [];   // candidacy_id => count
        $decodeErrors = 0;

        foreach ($ballots as $ballot) {
            try {
                $payload = json_decode(Crypt::decrypt($ballot->encrypted_payload), true);
            } catch (\Throwable $e) {
                $decodeErrors++;
                continue;
            }

            if (!is_array($payload)) {
                $decodeErrors++;
                continue;
            }

            $listId = $payload['list_id'] ?? null;
            if ($listId !== null) {
                $perList[$listId] = ($perList[$listId] ?? 0) + 1;
            }

            $candId = $payload['preferential_candidacy_id'] ?? null;
            if ($candId !== null) {
                $perCandidate[$candId] = ($perCandidate[$candId] ?? 0) + 1;
            }
        }

        $totalBallots = $ballots->count();

        // Resolve list names.
        $lists = ElectionList::query()
            ->whereIn('id', array_keys($perList))
            ->get()
            ->keyBy('id');

        $listResults = [];
        foreach ($perList as $listId => $count) {
            $list = $lists->get($listId);
            $listResults[] = [
                'list_id' => (int) $listId,
                'list_name' => $list?->list_name_en ?? $list?->list_name ?? "List #$listId",
                'votes' => $count,
                'percentage' => $totalBallots > 0
                    ? round(($count / $totalBallots) * 100, 1)
                    : 0.0,
            ];
        }
        usort($listResults, fn ($a, $b) => $b['votes'] <=> $a['votes']);

        // Resolve preferential candidate names.
        $candidacies = Candidacy::query()
            ->with('candidateProfile')
            ->whereIn('id', array_keys($perCandidate))
            ->get()
            ->keyBy('id');

        $candidateResults = [];
        foreach ($perCandidate as $candId => $count) {
            $cand = $candidacies->get($candId);
            $profile = $cand?->candidateProfile;
            $name = $profile?->full_name ?? $profile?->full_name_ar ?? "Candidacy #$candId";
            $candidateResults[] = [
                'candidacy_id' => (int) $candId,
                'candidate_name' => $name !== '' ? $name : "Candidacy #$candId",
                'votes' => $count,
            ];
        }
        usort($candidateResults, fn ($a, $b) => $b['votes'] <=> $a['votes']);

        // Turnout figures.
        $registered = ElectoralRollEntry::where('election_id', $election->id)->count();
        $voted = VoterElectionStatus::where('election_id', $election->id)
            ->where('has_voted', true)
            ->count();

        return [
            'election' => [
                'id' => $election->id,
                'title' => $election->title,
                'status' => $election->status,
            ],
            'turnout' => [
                'registered' => $registered,
                'voted' => $voted,
                'ballots_recorded' => $totalBallots,
                'turnout_percentage' => $registered > 0
                    ? round(($voted / $registered) * 100, 1)
                    : 0.0,
            ],
            'lists' => $listResults,
            'preferential_candidates' => $candidateResults,
            'decode_errors' => $decodeErrors,
        ];
    }
}
