<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ElectionList extends Model
{
    protected $table = 'lists';

    protected $fillable = [
        'election_id',
        'constituency_id',
        'list_name',
        'list_code',
        'list_name_en',
        'list_name_ar',
        'is_withdrawn',
        'source_ref',
    ];

    protected $casts = [
        'is_withdrawn' => 'boolean',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class, 'election_id');
    }

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class, 'constituency_id');
    }

    public function listCandidates(): HasMany
    {
        return $this->hasMany(ListCandidate::class, 'list_id');
    }

    public function candidacies(): BelongsToMany
    {
        return $this->belongsToMany(
            Candidacy::class,
            'list_candidates',
            'list_id',
            'candidacy_id'
        );
    }
}