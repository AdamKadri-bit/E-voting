<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CandidateProfile extends Model
{
    // Matches the actual candidate_profiles schema (bilingual full name).
    protected $fillable = [
        'national_id_number',
        'full_name',
        'full_name_ar',
        'date_of_birth',
        'civil_rights_status',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }
}