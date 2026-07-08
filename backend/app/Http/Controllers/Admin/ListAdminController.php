<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;
use App\Services\AuditLogService;
use Illuminate\Http\Request;

class ListAdminController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    /** All lists for an election, with their candidates. */
    public function index(Election $election)
    {
        $lists = ElectionList::query()
            ->where('election_id', $election->id)
            ->with([
                'constituency:id,name_en,name_ar,code',
                'listCandidates.candidacy.candidateProfile',
            ])
            ->orderBy('constituency_id')
            ->orderBy('list_name_en')
            ->get();

        return response()->json(['lists' => $lists]);
    }

    /** Create a list within an election + constituency. */
    public function store(Request $request, Election $election)
    {
        $data = $request->validate([
            'constituency_id' => ['required', 'integer', 'exists:constituencies,id'],
            'list_name_en' => ['required', 'string', 'max:255'],
            'list_name_ar' => ['nullable', 'string', 'max:255'],
            'list_code' => ['nullable', 'string', 'max:160'],
        ]);

        $list = ElectionList::create([
            'election_id' => $election->id,
            'constituency_id' => $data['constituency_id'],
            // Legacy required column: mirror the English name.
            'list_name' => $data['list_name_en'],
            'list_name_en' => $data['list_name_en'],
            'list_name_ar' => $data['list_name_ar'] ?? null,
            'list_code' => $data['list_code'] ?? null,
            'is_withdrawn' => false,
        ]);

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.list.created',
            ['election_id' => $election->id, 'list_id' => $list->id],
            $request
        );

        return response()->json(['list' => $list], 201);
    }

    /** Update a list's names / withdrawn flag. */
    public function update(Request $request, ElectionList $list)
    {
        $data = $request->validate([
            'list_name_en' => ['sometimes', 'string', 'max:255'],
            'list_name_ar' => ['nullable', 'string', 'max:255'],
            'list_code' => ['nullable', 'string', 'max:160'],
            'is_withdrawn' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['list_name_en'])) {
            $data['list_name'] = $data['list_name_en'];
        }

        $list->update($data);

        return response()->json(['list' => $list]);
    }

    /** Delete a list (its candidate memberships cascade). */
    public function destroy(Request $request, ElectionList $list)
    {
        $id = $list->id;
        $election = $list->election_id;
        $list->delete();

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.list.deleted',
            ['election_id' => $election, 'list_id' => $id],
            $request
        );

        return response()->json(['ok' => true]);
    }

    /** Candidacies eligible to be added to this list (same election + constituency). */
    public function availableCandidacies(ElectionList $list)
    {
        $alreadyOn = $list->listCandidates()->pluck('candidacy_id');

        $candidacies = Candidacy::query()
            ->where('election_id', $list->election_id)
            ->where('constituency_id', $list->constituency_id)
            ->whereNotIn('id', $alreadyOn)
            ->with('candidateProfile:id,full_name,full_name_ar')
            ->get();

        return response()->json(['candidacies' => $candidacies]);
    }

    /** Add a candidacy to a list. */
    public function addCandidate(Request $request, ElectionList $list)
    {
        $data = $request->validate([
            'candidacy_id' => ['required', 'integer', 'exists:candidacies,id'],
            'position_order' => ['nullable', 'integer', 'min:1'],
        ]);

        $candidacy = Candidacy::findOrFail($data['candidacy_id']);

        // The candidacy must belong to this list's election + constituency.
        if (
            $candidacy->election_id !== $list->election_id ||
            $candidacy->constituency_id !== $list->constituency_id
        ) {
            return response()->json([
                'message' => 'Candidate is not in this list\'s election/constituency.',
            ], 422);
        }

        if ($list->listCandidates()->where('candidacy_id', $candidacy->id)->exists()) {
            return response()->json(['message' => 'Candidate is already on this list.'], 422);
        }

        $member = ListCandidate::create([
            'list_id' => $list->id,
            'candidacy_id' => $candidacy->id,
            'position_order' => $data['position_order'] ?? null,
        ]);

        return response()->json(['list_candidate' => $member], 201);
    }

    /** Remove a candidate from a list. */
    public function removeCandidate(ElectionList $list, ListCandidate $listCandidate)
    {
        if ($listCandidate->list_id !== $list->id) {
            return response()->json(['message' => 'Not a member of this list.'], 404);
        }

        $listCandidate->delete();

        return response()->json(['ok' => true]);
    }
}
