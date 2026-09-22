<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One trustee seat in an election's key ceremony (public data only). */
class ElectionTrustee extends Model
{
    protected $fillable = [
        'election_id', 'user_id', 'trustee_index',
        'round1', 'round1_at', 'round2_at',
        'share_public_key', 'complaints', 'round3_at',
    ];

    protected $casts = [
        'round1' => 'array',
        'complaints' => 'array',
        'round1_at' => 'datetime',
        'round2_at' => 'datetime',
        'round3_at' => 'datetime',
        'trustee_index' => 'integer',
    ];

    public function election(): BelongsTo
    {
        return $this->belongsTo(Election::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
