<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Constituency;
use App\Models\Election;
use App\Services\AuditLogService;
use App\Services\ElectionLawService;
use App\Services\ElectionReadinessService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ElectionAdminController extends Controller
{
    public function __construct(
        private AuditLogService $audit,
        private ElectionLawService $law,
        private ElectionReadinessService $readiness,
    ) {
    }

    /** List all elections with summary counts and their activation readiness. */
    public function index()
    {
        Election::autoCloseExpired();

        $elections = Election::query()
            ->withCount(['lists', 'constituencies', 'encryptedBallots'])
            ->orderByDesc('id')
            ->get();

        $payload = $elections->map(fn (Election $election) => array_merge(
            $election->toArray(),
            [
                'readiness' => $this->readiness->evaluate($election),
                'statutory_ends_at' => $this->law->statutoryEndFor($election)?->toISOString(),
            ]
        ));

        return response()->json(['elections' => $payload]);
    }

    /** Show one election with its attached constituencies. */
    public function show(Election $election)
    {
        Election::autoCloseExpired();
        $election->refresh();

        $election->loadCount(['lists', 'encryptedBallots']);
        $election->load('constituencies:id,name_en,name_ar,code');

        return response()->json([
            'election' => array_merge($election->toArray(), [
                'readiness' => $this->readiness->evaluate($election),
                'statutory_ends_at' => $this->law->statutoryEndFor($election)?->toISOString(),
            ]),
        ]);
    }

    /** Create a new election. */
    public function store(Request $request)
    {
        $data = $this->validateElection($request);
        $data['ends_at'] = $this->resolveEndsAt($data);

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
        $data['ends_at'] = $this->resolveEndsAt($data);

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

        // Guard: an incomplete election cannot open for voting. Without a
        // window, constituencies, lists and candidates on those lists, voters
        // would be handed an empty ballot.
        if ($data['status'] === 'active') {
            $readiness = $this->readiness->evaluate($election);

            if (!$readiness['ready']) {
                return response()->json([
                    'message' => 'This election is incomplete and cannot be activated.',
                    'blockers' => $readiness['blockers'],
                    'readiness' => $readiness,
                ], 422);
            }

            // Polling that is already past its statutory close can't be opened.
            if ($election->ends_at->isPast()) {
                return response()->json([
                    'message' => 'The voting window has already ended; move it forward before activating.',
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

    /**
     * The end of polling is fixed by law, so `ends_at` is optional: when it
     * is left out we derive the statutory close from the start time and the
     * election type. An explicitly supplied end is kept as given.
     */
    private function resolveEndsAt(array $data): string
    {
        if (!empty($data['ends_at'])) {
            return $data['ends_at'];
        }

        return $this->law
            ->statutoryEnd($data['type'], new \Illuminate\Support\Carbon($data['starts_at']))
            ->toDateTimeString();
    }

    private function validateElection(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['parliamentary', 'municipal', 'other'])],
            'law_ref' => ['nullable', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'starts_at' => ['required', 'date'],
            // Optional: falls back to the statutory close (see resolveEndsAt).
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
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
            // Optional: falls back to the statutory close (see resolveEndsAt).
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
        ]);
    }
}
