<?php

namespace App\Services;

use App\Exceptions\RegistryRecordAlreadyClaimedException;
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

        $user->registry_person_id = $person->id;
        $user->verification_status = 'registry_linked';
        $user->can_vote = $person->is_eligible && !$person->has_voted;
        $user->save();

        return $person;
    }
}