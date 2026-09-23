<?php

namespace App\Services;

use App\Exceptions\RegistryRecordAlreadyClaimedException;
use App\Exceptions\RegistryRecordMismatchException;
use App\Models\RegistryPerson;
use App\Models\User;
use Illuminate\Support\Str;

class RegistryLinkingService
{
    public function linkUser(User $user, array $data): ?RegistryPerson
    {
        $person = null;

        // The registry number (رقم السجل) is the most specific key when the
        // scan read it. It is a record number in the town register, though,
        // and documents don't always print it the way the registry stores it
        // — so when number + birth date finds nobody, fall back to the same
        // name match used when no number is given.
        if (!empty($data['civil_registry_number'])) {
            $person = RegistryPerson::query()
                ->whereDate('date_of_birth', $data['date_of_birth'])
                ->where('civil_registry_number', $data['civil_registry_number'])
                ->first();
        }

        if (!$person && !empty($data['full_name']) && !empty($data['father_name']) && !empty($data['mother_name'])) {
            $person = RegistryPerson::query()
                ->whereDate('date_of_birth', $data['date_of_birth'])
                ->where(function ($q) use ($data) {
                    $q->whereRaw('LOWER(full_name_en) = ?', [Str::lower(trim($data['full_name']))])
                      ->orWhere('full_name_ar', trim($data['full_name']));
                })
                ->where(function ($q) use ($data) {
                    $q->whereRaw('LOWER(father_name_en) = ?', [Str::lower(trim($data['father_name']))])
                      ->orWhere('father_name_ar', trim($data['father_name']));
                })
                ->where(function ($q) use ($data) {
                    $q->whereRaw('LOWER(mother_name_en) = ?', [Str::lower(trim($data['mother_name']))])
                      ->orWhere('mother_name_ar', trim($data['mother_name']));
                })
                ->first();
        }

        if (!$person) {
            return null;
        }

        // A registry record is one real person, so it may back only one account.
        $claimed = User::where('registry_person_id', $person->id)
            ->where('id', '!=', $user->id)
            ->exists();

        if ($claimed) {
            throw new RegistryRecordAlreadyClaimedException();
        }

        // The ballot is built from the voter profile, so the verified identity
        // must be the same person — otherwise one person's document would
        // unlock another person's ballot.
        if (!self::sameIdentity($user, $person)) {
            throw new RegistryRecordMismatchException();
        }

        $user->registry_person_id = $person->id;
        $user->verification_status = 'registry_linked';
        $user->can_vote = $person->is_eligible && !$person->has_voted;
        $user->save();

        return $person;
    }

    /**
     * True when the account has no voter profile yet, or its profile and the
     * registry record agree on birth date and (when the registry records one)
     * constituency.
     */
    public static function sameIdentity(User $user, RegistryPerson $person): bool
    {
        $voter = $user->voter;
        if (!$voter) {
            return true;
        }

        if ($person->date_of_birth && $voter->date_of_birth
            && $person->date_of_birth->toDateString() !== $voter->date_of_birth->toDateString()) {
            return false;
        }

        if ($person->constituency_id !== null) {
            $profileConstituencies = \Illuminate\Support\Facades\DB::table('constituency_districts')
                ->where('district_id', $voter->registered_district_id)
                ->pluck('constituency_id')
                ->map(fn ($id) => (int) $id);
            if ($profileConstituencies->isNotEmpty() && !$profileConstituencies->contains((int) $person->constituency_id)) {
                return false;
            }
        }

        return true;
    }
}
