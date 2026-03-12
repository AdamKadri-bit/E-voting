<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VoterElectionStatus extends Model
{
    protected $table = 'voter_election_status';

    protected $fillable = [
        'voter_id',
        'election_id',
        'has_voted',
        'voted_at',
    ];

    protected $casts = [
        'has_voted' => 'boolean',
        'voted_at' => 'datetime',
    ];

    public function voter(): BelongsTo
    {
        return $this->belongsTo(Voter::class);
    }

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }
}