<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use App\Models\Election;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ElectionAdminController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    /** List all elections with summary counts. */
    public function index()
    {
        $elections = Election::query()
            ->withCount(['lists', 'constituencies', 'encryptedBallots'])
            ->orderByDesc('id')
            ->get();

        return response()->json(['elections' => $elections]);
    }

    /** Show one election with its attached constituencies. */
    public function show(Election $election)
    {
        $election->loadCount(['lists', 'encryptedBallots']);
        $election->load('constituencies:id,name_en,name_ar,code');

        return response()->json(['election' => $election]);
    }

    /** Create a new election. */
    public function store(Request $request)
    {
        $data = $this->validateElection($request);

        $election = Election::create($data);

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.election.created',
            ['election_id' => $election->id, 'title' => $election->title],
            $request
        );

        return response()->json(['election' => $election], 201);
    }

    /** Update an election's core fields. */
    public function update(Request $request, Election $election)
    {
        $data = $this->validateElectionUpdate($request);

        $election->update($data);

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.election.updated',
            ['election_id' => $election->id],
            $request
        );

        return response()->json(['election' => $election]);
    }

    /** Change only the status (draft/active/closed). */
    public function updateStatus(Request $request, Election $election)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'active', 'closed'])],
        ]);

        // Guard: an election cannot go active without a voting window and at
        // least one attached constituency (otherwise ballots can't be built).
        if ($data['status'] === 'active') {
            if (!$election->starts_at || !$election->ends_at) {
                return response()->json([
                    'message' => 'Set a voting window before activating this election.',
                ], 422);
            }
            if ($election->constituencies()->count() === 0) {
                return response()->json([
                    'message' => 'Attach at least one constituency before activating.',
                ], 422);
            }
        }

        $election->update(['status' => $data['status']]);

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.election.status_changed',
            ['election_id' => $election->id, 'status' => $data['status']],
            $request
        );

        return response()->json(['election' => $election]);
    }

    /** Attach/detach constituencies to an election (full sync). */
    public function syncConstituencies(Request $request, Election $election)
    {
        $data = $request->validate([
            'constituency_ids' => ['present', 'array'],
            'constituency_ids.*' => ['integer', 'exists:constituencies,id'],
        ]);

        $election->constituencies()->sync($data['constituency_ids']);

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.election.constituencies_synced',
            ['election_id' => $election->id, 'count' => count($data['constituency_ids'])],
            $request
        );

        $election->load('constituencies:id,name_en,name_ar,code');

        return response()->json(['election' => $election]);
    }

    /** List all constituencies (for the attach picker). */
    public function constituencies()
    {
        return response()->json([
            'constituencies' => Constituency::query()
                ->orderBy('name_en')
                ->get(['id', 'name_en', 'name_ar', 'code']),
        ]);
    }

    private function validateElection(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['parliamentary', 'municipal', 'other'])],
            'law_ref' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'status' => ['required', Rule::in(['draft', 'active', 'closed'])],
        ]);
    }

    /**
     * Validation for updating core election fields. Deliberately excludes
     * `status` — status transitions must go through updateStatus() so its
     * activation guard (voting window + at least one constituency) can't be
     * bypassed by editing the election directly.
     */
    private function validateElectionUpdate(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['parliamentary', 'municipal', 'other'])],
            'law_ref' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
        ]);
    }
}
