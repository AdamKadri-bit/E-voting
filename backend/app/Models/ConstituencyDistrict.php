<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConstituencyDistrict extends Model
{
    protected $fillable = [
        'constituency_id',
        'district_id',
    ];

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }
}