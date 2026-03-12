<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CandidateProfile extends Model
{
    protected $fillable = [
        'national_id_number',
        'first_name',
        'father_name',
        'last_name',
        'mother_full_name',
        'date_of_birth',
        'place_of_birth',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }
}