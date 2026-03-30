<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistryPerson extends Model
{
    protected $table = 'registry_people';

    protected $fillable = [
        'full_name_en',
        'full_name_ar',
        'father_name_en',
        'father_name_ar',
        'mother_name_en',
        'mother_name_ar',
        'date_of_birth',
        'gender',
        'civil_registry_number',
        'governorate',
        'district',
        'locality',
        'polling_center_name',
        'polling_station_code',
        'constituency_id',
        'is_eligible',
        'has_voted',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'is_eligible' => 'boolean',
        'has_voted' => 'boolean',
    ];

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class);
    }
}