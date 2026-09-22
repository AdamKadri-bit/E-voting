<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Homomorphic sum of every counted ballot for one option in one constituency. */
class TallyAggregate extends Model
{
    protected $fillable = [
        'election_id', 'constituency_id', 'option_type', 'option_id',
        'key', 'a', 'b', 'ballot_count', 'count',
    ];

    protected $casts = ['count' => 'integer', 'ballot_count' => 'integer', 'option_id' => 'integer', 'constituency_id' => 'integer'];
}
