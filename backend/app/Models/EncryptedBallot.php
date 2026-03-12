<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EncryptedBallot extends Model
{
    protected $fillable = [
        'chain_index',
        'election_id',
        'constituency_id',
        'encrypted_payload',
        'payload_hash',
        'receipt_hash',
        'previous_hash',
        'block_hash',
        'cast_at',
    ];

    protected $casts = [
        'cast_at' => 'datetime',
        'chain_index' => 'integer',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class);
    }
}