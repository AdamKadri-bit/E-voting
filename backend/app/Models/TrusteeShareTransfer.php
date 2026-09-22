<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A key-ceremony share sealed from one trustee to another; unreadable by the server. */
class TrusteeShareTransfer extends Model
{
    protected $fillable = ['election_id', 'from_index', 'to_index', 'box'];

    protected $casts = ['box' => 'array', 'from_index' => 'integer', 'to_index' => 'integer'];
}
