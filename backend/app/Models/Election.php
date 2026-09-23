<?php

namespace App\Models;

use App\Services\AuditLogService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Election extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'law_ref',
        'title',
        'description',
        'starts_at',
        'ends_at',
        'status',
        'crypto_scheme',
        'diaspora_voting_enabled',
        'trustee_threshold',
        'trustee_count',
        'key_ceremony_status',
        'joint_public_key',
        'tally_status',
        'results_published_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'diaspora_voting_enabled' => 'boolean',
        'trustee_threshold' => 'integer',
        'trustee_count' => 'integer',
        'results_published_at' => 'datetime',
    ];

    /** True for end-to-end verifiable elections (threshold-encrypted ballots). */
    public function isE2e(): bool
    {
        return $this->crypto_scheme !== 'legacy';
    }

    /** Polling is open right now: active and inside its window. */
    public function isOpen(): bool
    {
        return $this->status === 'active'
            && $this->starts_at !== null && $this->ends_at !== null
            && now()->between($this->starts_at, $this->ends_at);
    }

    /**
     * Closes every active election whose statutory voting window has run out.
     *
     * The law, not an administrator, decides when polling stops, so this is
     * driven off `ends_at` alone. It runs on a schedule (elections:auto-close)
     * and is also called when the admin panel reads election data, so the
     * status is never stale just because the scheduler isn't running.
     *
     * @return int number of elections closed
     */
    public static function autoCloseExpired(): int
    {
        $expired = static::query()
            ->where('status', 'active')
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->get();

        if ($expired->isEmpty()) {
            return 0;
        }

        $audit = app(AuditLogService::class);

        foreach ($expired as $election) {
            $election->update(['status' => 'closed']);

            // An end-to-end election moves straight to its homomorphic tally.
            if ($election->isE2e()) {
                app(\App\Services\E2e\TallyService::class)->aggregateIfReady($election);
            }

            // No actor: this transition is statutory, not an admin action.
            $audit->log(null, 'election.auto_closed', [
                'election_id' => $election->id,
                'title' => $election->title,
                'law_ref' => $election->law_ref,
                'ends_at' => $election->ends_at?->toISOString(),
            ]);
        }

        return $expired->count();
    }

    public function lists(): HasMany
    {
        return $this->hasMany(ElectionList::class, 'election_id');
    }

    public function candidacies(): HasMany
    {
        return $this->hasMany(Candidacy::class);
    }

    public function electoralRollEntries(): HasMany
    {
        return $this->hasMany(ElectoralRollEntry::class);
    }

    public function voterStatuses(): HasMany
    {
        return $this->hasMany(VoterElectionStatus::class);
    }

    public function encryptedBallots(): HasMany
    {
        return $this->hasMany(EncryptedBallot::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(Receipt::class);
    }

    public function trustees(): HasMany
    {
        return $this->hasMany(ElectionTrustee::class)->orderBy('trustee_index');
    }

    public function manifests(): HasMany
    {
        return $this->hasMany(BallotManifest::class);
    }

    public function e2eBallots(): HasMany
    {
        return $this->hasMany(E2eBallot::class);
    }

    public function participations(): HasMany
    {
        return $this->hasMany(ElectionParticipation::class);
    }

    public function constituencies(): BelongsToMany
    {
        return $this->belongsToMany(
            Constituency::class,
            'election_constituencies',
            'election_id',
            'constituency_id'
        );
    }
}