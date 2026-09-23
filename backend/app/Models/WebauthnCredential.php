<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A registered passkey / security key. */
class WebauthnCredential extends Model
{
    protected $fillable = ['user_id', 'credential_id', 'public_key', 'sign_count', 'name', 'aaguid', 'last_used_at'];

    protected $hidden = ['public_key'];

    protected $casts = ['last_used_at' => 'datetime', 'sign_count' => 'integer'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
