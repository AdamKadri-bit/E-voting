<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A frozen ballot style (election × constituency × minor district). */
class BallotManifest extends Model
{
    protected $fillable = ['election_id', 'constituency_id', 'district_id', 'options', 'constraints', 'hash'];

    protected $casts = ['options' => 'array', 'constraints' => 'array'];

    /** Shape shared with frontend/src/crypto/manifest.ts and App\Crypto\BallotCrypto. */
    public function toCrypto(): array
    {
        return [
            'id' => $this->id,
            'election_id' => (int) $this->election_id,
            'constituency_id' => (int) $this->constituency_id,
            'district_id' => $this->district_id === null ? null : (int) $this->district_id,
            'options' => $this->options,
            'constraints' => $this->constraints,
            'hash' => $this->hash,
        ];
    }
}
