<?php

namespace App\Http\Controllers;

use App\Models\E2eBallot;
use App\Models\Election;
use App\Models\User;
use App\Services\E2e\CredentialService;
use App\Services\Geo\Countries;
use App\Services\VoterStatusService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Voter-facing election list and the resident/diaspora status. */
class VoterElectionsController extends Controller
{
    public function __construct(
        private VoterStatusService $status,
        private CredentialService $credentials,
        private Countries $countries,
    ) {
    }

    private function user(Request $request): ?User
    {
        return User::with('voter')->find($request->attributes->get('auth')->sub ?? null);
    }

    public function index(Request $request)
    {
        $user = $this->user($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        Election::autoCloseExpired();
        $voter = $user->voter;
        // Verified = linked to a registry record that is the same person as the voter profile.
        $verified = $user->registryPerson !== null && \App\Services\RegistryLinkingService::sameIdentity($user, $user->registryPerson);

        $elections = Election::query()
            ->whereIn('status', ['active', 'closed'])
            ->orderByDesc('starts_at')
            ->get()
            ->map(function (Election $e) use ($voter, $verified) {
                $eligible = $voter && $e->electoralRollEntries()->where('national_id_number', $voter->national_id_number)->exists();
                $voted = $voter && $e->isE2e()
                    && E2eBallot::where('election_id', $e->id)->where('credential', $this->credentials->credentialFor($e->id, $voter->id))->exists();

                return [
                    'id' => $e->id,
                    'title' => $e->title,
                    'description' => $e->description,
                    'status' => $e->status,
                    'is_open' => $e->isOpen(),
                    'starts_at' => $e->starts_at?->toISOString(),
                    'ends_at' => $e->ends_at?->toISOString(),
                    'crypto_scheme' => $e->crypto_scheme,
                    'diaspora_voting_enabled' => (bool) $e->diaspora_voting_enabled,
                    'key_ready' => $e->key_ceremony_status === 'complete',
                    'tally_status' => $e->tally_status,
                    'eligible' => $eligible,
                    'verified' => $verified,
                    'has_voted' => $voted,
                ];
            });

        return response()->json(['elections' => $elections]);
    }

    public function updateStatus(Request $request)
    {
        $user = $this->user($request);
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if ($user->role !== 'voter') {
            throw ValidationException::withMessages(['voter_type' => 'Only voter accounts have a voting status.']);
        }

        $this->status->set($user, $request->input('voter_type'), $request->input('residence_country'));

        return response()->json(['ok' => true, 'status' => $this->statusPayload($user->fresh())]);
    }

    public function statusPayload(User $user): array
    {
        return [
            'voter_type' => $user->voter_type,
            'residence_country' => $user->residence_country,
            'residence_country_name' => $this->countries->name($user->residence_country),
            'required' => $this->status->isRequired($user),
            'locked' => $this->status->isLocked($user),
            'locked_by' => $this->status->isLocked($user) ? $this->status->openEligibleElections($user)->pluck('title') : [],
            'set_at' => $user->voter_type_set_at?->toISOString(),
        ];
    }
}
