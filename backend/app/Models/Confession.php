<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Confession extends Model
{
    protected $fillable = [
        'name_en',
        'name_ar',
        'code',
    ];

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }
}