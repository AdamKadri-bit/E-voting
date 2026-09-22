<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One trustee's proven partial decryption of every tally aggregate. */
class PartialDecryption extends Model
{
    protected $fillable = ['election_id', 'trustee_index', 'shares'];

    protected $casts = ['shares' => 'array', 'trustee_index' => 'integer'];
}
