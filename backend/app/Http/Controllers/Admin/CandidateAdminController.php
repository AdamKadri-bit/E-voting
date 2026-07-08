<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidacy;
use App\Models\CandidateProfile;
use App\Models\Election;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CandidateAdminController extends Controller
{
    public function __construct(private AuditLogService $audit)
    {
    }

    /** Candidacies registered in an election. */
    public function index(Election $election)
    {
        $candidacies = Candidacy::query()
            ->where('election_id', $election->id)
            ->with([
                'candidateProfile:id,national_id_number,full_name,full_name_ar,date_of_birth',
                'constituency:id,name_en,name_ar,code',
            ])
            ->orderByDesc('id')
            ->get();

        return response()->json(['candidacies' => $candidacies]);
    }

    /**
     * Register a candidacy: reuse the candidate profile if the national ID
     * already exists, otherwise create it, then create the candidacy for the
     * election + constituency.
     */
    public function store(Request $request, Election $election)
    {
        $data = $request->validate([
            'national_id_number' => ['required', 'string', 'max:30'],
            'full_name' => ['required', 'string', 'max:200'],
            'full_name_ar' => ['nullable', 'string', 'max:200'],
            'date_of_birth' => ['required', 'date'],
            'constituency_id' => ['required', 'integer', 'exists:constituencies,id'],
            'status' => ['nullable', Rule::in(['pending', 'accepted', 'rejected', 'withdrawn'])],
        ]);

        $profile = CandidateProfile::firstOrCreate(
            ['national_id_number' => $data['national_id_number']],
            [
                'full_name' => $data['full_name'],
                'full_name_ar' => $data['full_name_ar'] ?? null,
                'date_of_birth' => $data['date_of_birth'],
            ]
        );

        // Enforce the unique (election, profile, constituency) rule with a clear message.
        $exists = Candidacy::where('election_id', $election->id)
            ->where('candidate_profile_id', $profile->id)
            ->where('constituency_id', $data['constituency_id'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This candidate is already registered in this constituency for this election.',
            ], 422);
        }

        $candidacy = Candidacy::create([
            'election_id' => $election->id,
            'candidate_profile_id' => $profile->id,
            'constituency_id' => $data['constituency_id'],
            'status' => $data['status'] ?? 'accepted',
        ]);

        $candidacy->load('candidateProfile:id,national_id_number,full_name,full_name_ar');

        $this->audit->log(
            $request->attributes->get('admin_user'),
            'admin.candidacy.created',
            ['election_id' => $election->id, 'candidacy_id' => $candidacy->id],
            $request
        );

        return response()->json(['candidacy' => $candidacy], 201);
    }

    /** Update a candidacy's status. */
    public function updateStatus(Request $request, Candidacy $candidacy)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'accepted', 'rejected', 'withdrawn'])],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $candidacy->update([
            'status' => $data['status'],
            'rejection_reason' => $data['rejection_reason'] ?? null,
        ]);

        return response()->json(['candidacy' => $candidacy]);
    }
}
