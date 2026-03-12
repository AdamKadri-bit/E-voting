<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Election extends Model
{
    protected $fillable = [
        'type',
        'law_ref',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function lists(): HasMany
    {
        return $this->hasMany(ElectionList::class, 'election_id');
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }

    public function electoralRollEntries(): HasMany
    {
        return $this->hasMany(ElectoralRollEntry::class);
    }

    public function voterStatuses(): HasMany
    {
        return $this->hasMany(VoterElectionStatus::class);
    }

    public function encryptedBallots(): HasMany
    {
        return $this->hasMany(EncryptedBallot::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }

    public function constituencies(): BelongsToMany
    {
        return $this->belongsToMany(
            Constituency::class,
            'election_constituencies',
            'election_id',
            'constituency_id'
        );
    }
}