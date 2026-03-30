<?php

namespace App\Services;

use App\Models\RegistryPerson;
use App\Models\User;
use Illuminate\Support\Str;

class RegistryLinkingService
{
    public function linkUser(User $user, array $data): ?RegistryPerson
    {
        $query = RegistryPerson::query()
            ->whereDate('date_of_birth', $data['date_of_birth']);

        if (!empty($data['civil_registry_number'])) {
            $query->where('civil_registry_number', $data['civil_registry_number']);
        } else {
            $query
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
                });
        }

        $person = $query->first();

        if (!$person) {
            return null;
        }

        $user->registry_person_id = $person->id;
        $user->verification_status = 'registry_linked';
        $user->can_vote = $person->is_eligible && !$person->has_voted;
        $user->save();

        return $person;
    }
}