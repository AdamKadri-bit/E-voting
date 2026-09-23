<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A cast ballot on the public bulletin board. No voter identity and no
 * timestamps by design — see the create_e2e_ballot_tables migration.
 */
class E2eBallot extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'election_id', 'manifest_id', 'constituency_id', 'credential',
        'tracking_code', 'short_code', 'ciphertexts', 'proofs', 'status',
    ];

    protected $casts = ['ciphertexts' => 'array', 'proofs' => 'array'];
}
