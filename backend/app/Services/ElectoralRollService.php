<?php

namespace App\Services;

use App\Models\Election;
use App\Models\ElectoralRollEntry;
use App\Models\RegistryPerson;
use App\Models\User;
use App\Models\Voter;

/**
 * Electoral rolls drawn from the civil registry, as in Lebanon: every
 * eligible person registered in one of an election's constituencies is on
 * its roll. Also turns a verified registry link into the voter profile the
 * ballot is built from, so a new account can vote once it has verified.
 */
class ElectoralRollService
{
    /** Puts every eligible registry person of the election's constituencies on its roll. Idempotent. */
    public function syncFromRegistry(Election $election): int
    {
        $constituencies = $election->constituencies()->pluck('constituencies.id');
        $added = 0;

        RegistryPerson::query()
            ->whereIn('constituency_id', $constituencies)
            ->where('is_eligible', true)
            ->whereNotNull('date_of_birth')
            ->orderBy('id')
            ->each(function (RegistryPerson $person) use ($election, &$added) {
                $district = $person->resolveDistrict();
                if (!$district) {
                    return;
                }
                [$first, $last] = $person->nameParts();
                // Someone already linked to a voter profile keeps that profile's key, so nobody is on the roll twice.
                $key = Voter::query()
                    ->whereIn('user_id', User::where('registry_person_id', $person->id)->select('id'))
                    ->value('national_id_number') ?? $person->rollKey();
                $entry = ElectoralRollEntry::firstOrCreate(
                    ['election_id' => $election->id, 'national_id_number' => $key],
                    [
                        'first_name' => $first,
                        'father_name' => (string) ($person->father_name_en ?: $person->father_name_ar),
                        'last_name' => $last,
                        'mother_full_name' => $person->mother_name_en ?: $person->mother_name_ar,
                        'date_of_birth' => $person->date_of_birth,
                        'registered_governorate_id' => $district->governorate_id,
                        'registered_district_id' => $district->id,
                    ]
                );
                $added += $entry->wasRecentlyCreated ? 1 : 0;
            });

        return $added;
    }

    /**
     * Creates the voter profile for a verified account that has none, from the
     * registry record it just linked, and adds it to the roll of every draft or
     * active election covering that constituency. Returns null when the record
     * lacks what a profile needs (district or birth date).
     */
    public function ensureVoterProfile(User $user, RegistryPerson $person): ?Voter
    {
        if ($user->voter) {
            return $user->voter;
        }

        $district = $person->resolveDistrict();
        if (!$district || !$person->date_of_birth) {
            return null;
        }
        [$first, $last] = $person->nameParts();

        $voter = Voter::create([
            'user_id' => $user->id,
            'national_id_number' => $person->rollKey(),
            'first_name' => $first,
            'father_name' => (string) ($person->father_name_en ?: $person->father_name_ar),
            'last_name' => $last,
            'mother_full_name' => $person->mother_name_en ?: $person->mother_name_ar,
            'date_of_birth' => $person->date_of_birth,
            'place_of_birth' => $person->locality,
            'registered_governorate_id' => $district->governorate_id,
            'registered_district_id' => $district->id,
        ]);

        if ($person->is_eligible) {
            Election::query()
                ->whereIn('status', ['draft', 'active'])
                ->where('crypto_scheme', 'e2e')
                ->whereHas('constituencies', fn ($q) => $q->where('constituencies.id', $person->constituency_id))
                ->get()
                ->each(fn (Election $e) => $this->syncFromRegistry($e));
        }

        return $voter;
    }
}
