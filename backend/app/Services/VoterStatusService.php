<?php

namespace App\Services;

use App\Models\Election;
use App\Models\User;
use App\Services\Geo\Countries;
use Illuminate\Validation\ValidationException;

/**
 * Resident / diaspora status, chosen after sign-in. The status decides which
 * voting path a voter takes and which country their participation is filed
 * under, so it is frozen while any election they can vote in is open.
 */
class VoterStatusService
{
    public const TYPES = ['resident', 'diaspora'];

    public function __construct(private Countries $countries)
    {
    }

    /** Accounts that can vote (voter profile or registry link) must pick a status. */
    public function isRequired(User $user): bool
    {
        return $user->role === 'voter'
            && $user->voter_type === null
            && ($user->registry_person_id !== null || $user->voter()->exists());
    }

    /** Elections open right now in which this user is on the electoral roll. */
    public function openEligibleElections(User $user)
    {
        $voter = $user->voter;
        if (!$voter) {
            return collect();
        }

        return Election::query()
            ->where('status', 'active')
            ->where('starts_at', '<=', now())
            ->where('ends_at', '>=', now())
            ->whereHas('electoralRollEntries', fn ($q) => $q->where('national_id_number', $voter->national_id_number))
            ->get(['id', 'title']);
    }

    public function isLocked(User $user): bool
    {
        return $user->voter_type !== null && $this->openEligibleElections($user)->isNotEmpty();
    }

    /** Validates and stores the status; throws a field-level ValidationException on bad input. */
    public function set(User $user, mixed $type, mixed $country): User
    {
        if (!in_array($type, self::TYPES, true)) {
            throw ValidationException::withMessages(['voter_type' => 'Choose resident or diaspora.']);
        }

        if ($type === 'diaspora') {
            $country = is_string($country) ? strtoupper(trim($country)) : null;
            if (!$this->countries->exists($country)) {
                throw ValidationException::withMessages(['residence_country' => 'Choose your country of residence from the list.']);
            }
            if ($country === 'LB') {
                throw ValidationException::withMessages(['residence_country' => 'Voters living in Lebanon vote as residents.']);
            }
        } else {
            $country = null;
        }

        if ($this->isLocked($user) && ($user->voter_type !== $type || $user->residence_country !== $country)) {
            $titles = $this->openEligibleElections($user)->pluck('title')->implode(', ');
            throw ValidationException::withMessages([
                'voter_type' => "Your voter status can't change while an election you can vote in is open ({$titles}).",
            ]);
        }

        $user->forceFill([
            'voter_type' => $type,
            'residence_country' => $country,
            'voter_type_set_at' => now(),
        ])->save();

        return $user;
    }

    /** The country a participation is filed under: Lebanon for residents. */
    public function declaredCountry(User $user): string
    {
        return $user->voter_type === 'diaspora' ? (string) $user->residence_country : 'LB';
    }
}
