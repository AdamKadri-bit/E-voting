<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Voter extends Model
{
    protected $fillable = [
        'user_id',
        'national_id_number',
        'first_name',
        'father_name',
        'last_name',
        'mother_full_name',
        'date_of_birth',
        'place_of_birth',
        'registered_governorate_id',
        'registered_district_id',
        'current_residence_text',
        'civil_rights_status',
        'eligibility_status',
        'ineligibility_reason',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class, 'registered_governorate_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class, 'registered_district_id');
    }

    public function electionStatuses(): HasMany
    {
        return $this->hasMany(VoterElectionStatus::class);
    }
}