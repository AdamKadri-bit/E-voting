<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Governorate extends Model
{
    protected $fillable = [
        'name_en',
        'name_ar',
        'code',
    ];

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    public function voters(): HasMany
    {
        return $this->hasMany(Voter::class, 'registered_governorate_id');
    }

    public function electoralRollEntries(): HasMany
    {
        return $this->hasMany(ElectoralRollEntry::class, 'registered_governorate_id');
    }
}