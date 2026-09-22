<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** That a voter took part in an election, and from which country — never how they voted. */
class ElectionParticipation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'election_id', 'voter_id', 'voter_type', 'declared_country',
        'ip_country', 'location_mismatch', 'coarse_timestamp',
    ];

    protected $casts = ['location_mismatch' => 'boolean', 'coarse_timestamp' => 'datetime'];
}
