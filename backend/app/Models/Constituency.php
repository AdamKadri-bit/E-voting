<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Constituency extends Model
{
    protected $fillable = [
        'name_en',
        'name_ar',
        'code',
    ];

    public function lists(): HasMany
    {
        return $this->hasMany(ElectionList::class, 'constituency_id');
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }

    public function constituencyDistricts(): HasMany
    {
        return $this->hasMany(ConstituencyDistrict::class);
    }

    public function electionConstituencies(): HasMany
    {
        return $this->hasMany(ElectionConstituency::class);
    }

    public function encryptedBallots(): HasMany
    {
        return $this->hasMany(EncryptedBallot::class);
    }

    public function districts(): BelongsToMany
    {
        return $this->belongsToMany(
            District::class,
            'constituency_districts',
            'constituency_id',
            'district_id'
        );
    }

    public function elections(): BelongsToMany
    {
        return $this->belongsToMany(
            Election::class,
            'election_constituencies',
            'constituency_id',
            'election_id'
        );
    }
}