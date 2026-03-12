<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class District extends Model
{
    protected $fillable = [
        'governorate_id',
        'name_en',
        'name_ar',
        'code',
    ];

    public function governorate(): BelongsTo
    {
        return $this->belongsTo(Governorate::class);
    }

    public function voters(): HasMany
    {
        return $this->hasMany(Voter::class, 'registered_district_id');
    }

    public function electoralRollEntries(): HasMany
    {
        return $this->hasMany(ElectoralRollEntry::class, 'registered_district_id');
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }

    public function constituencyDistricts(): HasMany
    {
        return $this->hasMany(ConstituencyDistrict::class);
    }

    public function constituencies(): BelongsToMany
    {
        return $this->belongsToMany(
            Constituency::class,
            'constituency_districts',
            'district_id',
            'constituency_id'
        );
    }
}