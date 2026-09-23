<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A spoiled ballot a voter chose to audit: published with its randomness, never counted. */
class AuditedBallot extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'election_id', 'manifest_id', 'tracking_code', 'short_code',
        'ciphertexts', 'selections', 'randomness',
    ];

    protected $casts = ['ciphertexts' => 'array', 'selections' => 'array', 'randomness' => 'array'];
}
