<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListCandidate extends Model
{
    protected $fillable = [
        'list_id',
        'candidacy_id',
        'position_order',
    ];

    public function list(): BelongsTo
    {
        return $this->belongsTo(ElectionList::class, 'list_id');
    }

    public function candidacy(): BelongsTo
    {
        return $this->belongsTo(Candidacy::class, 'candidacy_id');
    }
}