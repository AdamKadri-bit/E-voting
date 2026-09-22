<?php

namespace App\Services\E2e;

use App\Crypto\BallotCrypto;
use App\Models\BallotManifest;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use Illuminate\Support\Facades\DB;

/**
 * Builds and freezes ballot manifests. Option order is deterministic
 * (lists by id, then each list's accepted candidates from the voter's minor
 * district by candidacy id) so the same inputs always hash the same.
 */
class ManifestService
{
    public function forVoter(Election $election, Constituency $constituency, ?int $districtId): BallotManifest
    {
        $existing = BallotManifest::query()
            ->where('election_id', $election->id)
            ->where('constituency_id', $constituency->id)
            ->where('district_id', $districtId)
            ->first();

        return $existing ?? $this->create($election, $constituency->id, $districtId);
    }

    /** Freezes every ballot style when polling opens, so later list edits can't change a live ballot. */
    public function freezeAll(Election $election): int
    {
        $count = 0;
        $pairs = DB::table('election_constituencies')
            ->join('constituency_districts', 'constituency_districts.constituency_id', '=', 'election_constituencies.constituency_id')
            ->where('election_constituencies.election_id', $election->id)
            ->select('election_constituencies.constituency_id', 'constituency_districts.district_id')
            ->get();

        foreach ($pairs as $p) {
            $exists = BallotManifest::where('election_id', $election->id)
                ->where('constituency_id', $p->constituency_id)
                ->where('district_id', $p->district_id)
                ->exists();
            if (!$exists) {
                $this->create($election, (int) $p->constituency_id, (int) $p->district_id);
                $count++;
            }
        }

        return $count;
    }

    public function build(Election $election, int $constituencyId, ?int $districtId): array
    {
        $lists = ElectionList::query()
            ->where('election_id', $election->id)
            ->where('constituency_id', $constituencyId)
            ->where('is_withdrawn', false)
            ->with(['listCandidates.candidacy.candidateProfile'])
            ->orderBy('id')
            ->get();

        $options = [];
        $listIndex = [];
        foreach ($lists as $list) {
            $listIndex[$list->id] = count($options);
            $options[] = [
                'type' => 'list',
                'id' => (int) $list->id,
                'list_id' => null,
                'label' => (string) ($list->list_name_en ?: ($list->list_name ?: ($list->list_name_ar ?: "List #{$list->id}"))),
            ];
        }

        $byList = [];
        foreach ($lists as $list) {
            $cands = $list->listCandidates
                ->filter(fn ($lc) => $lc->candidacy
                    && $lc->candidacy->status === 'accepted'
                    && ($lc->candidacy->district_id === null || $districtId === null || (int) $lc->candidacy->district_id === $districtId))
                ->sortBy('candidacy_id');
            foreach ($cands as $lc) {
                $profile = $lc->candidacy->candidateProfile;
                $byList[$list->id][] = count($options);
                $options[] = [
                    'type' => 'candidate',
                    'id' => (int) $lc->candidacy_id,
                    'list_id' => (int) $list->id,
                    'label' => (string) ($profile?->full_name ?: ($profile?->full_name_ar ?: "Candidate #{$lc->candidacy_id}")),
                ];
            }
        }

        $constraints = [
            ['type' => 'exact', 'value' => 1, 'indices' => array_values($listIndex), 'parent' => null],
        ];
        $candidateIndices = array_merge([], ...array_values($byList));
        if ($candidateIndices !== []) {
            $constraints[] = ['type' => 'max', 'value' => 1, 'indices' => $candidateIndices, 'parent' => null];
        }
        foreach ($byList as $listId => $indices) {
            $constraints[] = ['type' => 'implies', 'value' => 1, 'indices' => $indices, 'parent' => $listIndex[$listId]];
        }

        $manifest = [
            'election_id' => (int) $election->id,
            'constituency_id' => $constituencyId,
            'district_id' => $districtId,
            'options' => $options,
            'constraints' => $constraints,
        ];
        $manifest['hash'] = BallotCrypto::manifestHash($manifest);

        return $manifest;
    }

    private function create(Election $election, int $constituencyId, ?int $districtId): BallotManifest
    {
        $m = $this->build($election, $constituencyId, $districtId);

        return BallotManifest::firstOrCreate(
            ['election_id' => $election->id, 'constituency_id' => $constituencyId, 'district_id' => $districtId],
            ['options' => $m['options'], 'constraints' => $m['constraints'], 'hash' => $m['hash']]
        );
    }
}
