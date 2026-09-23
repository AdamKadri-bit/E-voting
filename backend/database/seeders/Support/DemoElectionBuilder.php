<?php

namespace Database\Seeders\Support;

use App\Crypto\BallotCrypto;
use App\Crypto\Group;
use App\Crypto\Keyfile;
use App\Crypto\Threshold;
use App\Models\CandidateProfile;
use App\Models\Candidacy;
use App\Models\District;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ElectionParticipation;
use App\Models\ElectionTrustee;
use App\Models\ElectoralRollEntry;
use App\Models\ListCandidate;
use App\Models\RegistryPerson;
use App\Models\User;
use App\Models\Voter;
use App\Services\E2e\BallotCastService;
use App\Services\E2e\CredentialService;
use App\Services\E2e\ManifestService;
use App\Services\E2e\TallyService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Builds end-to-end elections for the demo seeder and the test suite.
 *
 * IMPORTANT: simulateCeremony() plays all trustees at once inside PHP, so the
 * key shares exist in this process's memory. That is acceptable ONLY for demo
 * and test data. Real elections run the ceremony in each trustee's browser
 * (frontend/src/pages/trustee/KeyCeremonyPage.tsx), where no share ever
 * reaches the server.
 */
class DemoElectionBuilder
{
    /**
     * @param array<int, array{constituency_id:int, lists: array<int, array{name:string, candidates: array<int, array{name:string, district_id:int}>}>}> $layout
     */
    public function election(array $attrs, array $layout): Election
    {
        $election = Election::create(array_merge([
            'type' => 'parliamentary',
            'law_ref' => 'Law 44/2017',
            'description' => 'Demonstration election (seeded).',
            'starts_at' => now()->subHours(2),
            'ends_at' => now()->addDays(3),
            'status' => 'draft',
            'crypto_scheme' => 'e2e',
        ], $attrs));

        foreach ($layout as $c) {
            $election->constituencies()->syncWithoutDetaching([$c['constituency_id']]);
            foreach ($c['lists'] as $l) {
                $list = ElectionList::create([
                    'election_id' => $election->id,
                    'constituency_id' => $c['constituency_id'],
                    'list_name' => $l['name'],
                    'list_name_en' => $l['name'],
                    'list_name_ar' => $l['name_ar'] ?? null,
                    'is_withdrawn' => false,
                ]);
                foreach ($l['candidates'] as $i => $cand) {
                    $profile = CandidateProfile::create([
                        'national_id_number' => 'DEMO' . $election->id . '-' . $list->id . '-' . $i . '-' . random_int(1000, 9999),
                        'full_name' => $cand['name'],
                        'full_name_ar' => $cand['name_ar'] ?? $cand['name'],
                        'date_of_birth' => '1975-01-01',
                        'civil_rights_status' => 'full',
                    ]);
                    $candidacy = Candidacy::create([
                        'election_id' => $election->id,
                        'candidate_profile_id' => $profile->id,
                        'constituency_id' => $c['constituency_id'],
                        'district_id' => $cand['district_id'],
                        'status' => 'accepted',
                    ]);
                    ListCandidate::create(['list_id' => $list->id, 'candidacy_id' => $candidacy->id, 'position_order' => $i + 1]);
                }
            }
        }

        // Reload so column defaults (diaspora_voting_enabled, tally_status, …) are present.
        return $election->fresh();
    }

    /**
     * Runs the DKG for every trustee at once and returns the secret shares
     * (trustee_index => binary scalar). Demo/test data only — see class doc.
     */
    public function simulateCeremony(Election $election, array $userIds, int $threshold): array
    {
        $n = count($userIds);
        $r1 = [];
        foreach (array_values($userIds) as $i => $uid) {
            $r1[$i + 1] = Threshold::round1($election->id, $i + 1, $threshold);
        }
        $shares = [];
        foreach (array_keys($r1) as $j) {
            $s = Group::intScalar(0);
            foreach ($r1 as $r) {
                $s = Group::sAdd($s, Threshold::evalPoly($r['coefficients'], $j));
            }
            $shares[$j] = $s;
        }
        $round1s = array_map(fn ($r) => $r['pub'], $r1);

        DB::transaction(function () use ($election, $userIds, $round1s, $shares, $threshold, $n) {
            ElectionTrustee::where('election_id', $election->id)->delete();
            foreach (array_values($userIds) as $i => $uid) {
                $idx = $i + 1;
                ElectionTrustee::create([
                    'election_id' => $election->id, 'user_id' => $uid, 'trustee_index' => $idx,
                    'round1' => $round1s[$idx], 'round1_at' => now(), 'round2_at' => now(),
                    'share_public_key' => bin2hex(Group::mulBase($shares[$idx])), 'complaints' => [], 'round3_at' => now(),
                ]);
            }
            $election->update([
                'trustee_threshold' => $threshold, 'trustee_count' => $n,
                'key_ceremony_status' => 'complete',
                'joint_public_key' => bin2hex(Threshold::jointPublicKey(array_values($round1s))),
            ]);
        });

        return $shares;
    }

    public function open(Election $election): Election
    {
        $election->update(['status' => 'active']);
        app(ManifestService::class)->freezeAll($election);

        return $election->fresh();
    }

    /**
     * @param bool $registryLinked true = already verified against the voter
     *   registry (the ID-scan / OCR step on /verify-voter is done); false =
     *   a matching registry record exists but the account still has to link it.
     */
    public function voter(string $email, string $name, District $district, ?string $type, ?string $country, array $elections, string $password = 'Password123!', bool $registryLinked = true): User
    {
        $user = User::firstOrCreate(['email' => $email], [
            'name' => $name,
            'password' => Hash::make($password),
            'role' => 'voter',
            'verification_status' => 'registry_linked',
            'can_vote' => true,
        ]);
        $user->forceFill([
            'email_verified_at' => now(),
            'voter_type' => $type,
            'residence_country' => $type === 'diaspora' ? $country : null,
            'voter_type_set_at' => $type ? now() : null,
        ])->save();

        [$first, $last] = array_pad(explode(' ', $name, 2), 2, 'Voter');
        $nid = 'NID-' . substr(hash('sha256', $email), 0, 12);
        $voter = Voter::updateOrCreate(['user_id' => $user->id], [
            'national_id_number' => $nid,
            'first_name' => $first, 'father_name' => 'Demo', 'last_name' => $last,
            'date_of_birth' => '1990-01-01',
            'registered_governorate_id' => $district->governorate_id,
            'registered_district_id' => $district->id,
            'current_residence_text' => $type === 'diaspora' ? $country : 'Lebanon',
        ]);

        $this->registryRecord($user, $district, $first, $last, $registryLinked);

        foreach ($elections as $election) {
            ElectoralRollEntry::updateOrCreate(
                ['election_id' => $election->id, 'national_id_number' => $nid],
                [
                    'first_name' => $first, 'father_name' => 'Demo', 'last_name' => $last,
                    'date_of_birth' => '1990-01-01',
                    'registered_governorate_id' => $district->governorate_id,
                    'registered_district_id' => $district->id,
                ]
            );
        }

        return $user->fresh('voter');
    }

    /**
     * The voter-registry record behind a demo voter, matching what the
     * /verify-voter form (or the ID OCR) will submit: full name, father
     * "Demo", mother "Demo Mother", born 1990-01-01.
     */
    public function registryRecord(User $user, District $district, string $first, string $last, bool $link): RegistryPerson
    {
        $person = RegistryPerson::updateOrCreate(
            ['civil_registry_number' => 'DEMO-' . strtoupper(substr(hash('sha256', $user->email), 0, 10))],
            [
                'full_name_en' => "{$first} {$last}",
                'father_name_en' => 'Demo',
                'mother_name_en' => 'Demo Mother',
                'date_of_birth' => '1990-01-01',
                'governorate' => $district->governorate?->name_en,
                'district' => $district->name_en,
                'constituency_id' => DB::table('constituency_districts')->where('district_id', $district->id)->value('constituency_id'),
                'is_eligible' => true,
                'has_voted' => false,
            ]
        );

        $user->forceFill($link
            ? ['registry_person_id' => $person->id, 'verification_status' => 'registry_linked', 'can_vote' => true]
            : ['registry_person_id' => null, 'verification_status' => 'account_created', 'can_vote' => false]
        )->save();

        return $person;
    }

    /** Selection vector for "list X, optional preferential candidate Y". */
    public static function selection(array $manifest, int $listId, ?int $candidacyId): array
    {
        return array_map(fn ($o) => $o['type'] === 'list'
            ? (int) ($o['id'] === $listId)
            : (int) ($candidacyId !== null && $o['id'] === $candidacyId), $manifest['options']);
    }

    /** Encrypts and casts through the real service (proof checks, supersession, participation). */
    public function cast(Election $election, User $user, int $listId, ?int $candidacyId, ?string $ipCountry = null): array
    {
        $svc = app(BallotCastService::class);
        $b = $svc->ballotFor($user, $election);
        $enc = BallotCrypto::encrypt($b['manifest'], $b['joint_public_key'], $b['credential'], self::selection($b['manifest'], $listId, $candidacyId));
        $receipt = $svc->cast($user, $election, $enc['ballot'], null);

        // Seed-only: set the detected country the offline GeoIP lookup would have produced.
        if ($ipCountry !== null) {
            $p = ElectionParticipation::where('election_id', $election->id)->where('voter_id', $user->voter->id)->first();
            if ($p && $p->ip_country === null) {
                $p->update(['ip_country' => $ipCountry, 'location_mismatch' => $ipCountry !== $p->declared_country]);
            }
        }

        return $receipt;
    }

    public function audit(Election $election, User $user, int $listId, ?int $candidacyId): array
    {
        $svc = app(BallotCastService::class);
        $b = $svc->ballotFor($user, $election);
        $enc = BallotCrypto::encrypt($b['manifest'], $b['joint_public_key'], $b['credential'], self::selection($b['manifest'], $listId, $candidacyId));

        return $svc->publishAudit($election, [
            'manifest_id' => $b['manifest']['id'],
            'manifest_hash' => $b['manifest']['hash'],
            'ciphertexts' => $enc['ballot']['ciphertexts'],
            'selections' => self::selection($b['manifest'], $listId, $candidacyId),
            'randomness' => $enc['randomness'],
        ]);
    }

    /** Closes polling, forms the encrypted tally and has the given trustees decrypt it. */
    public function closeAndDecrypt(Election $election, array $shares, array $trusteeIndices): Election
    {
        $election->update(['status' => 'closed', 'ends_at' => min($election->ends_at, now())]);
        $tally = app(TallyService::class);
        $tally->aggregateIfReady($election->fresh());
        $election->refresh();
        $aggs = $tally->aggregatesJson($election);
        foreach ($trusteeIndices as $j) {
            $seat = ElectionTrustee::where('election_id', $election->id)->where('trustee_index', $j)->first();
            $tally->submitPartial($election->fresh(), $seat, Threshold::partialDecrypt($election->id, $j, $shares[$j], $aggs));
        }

        return $election->fresh();
    }

    /** Demo-only: hand the seeded trustees a browser-compatible key file. */
    public function writeKeyfiles(Election $election, array $shares, string $passphrase, string $dir): void
    {
        @mkdir($dir, 0700, true);
        foreach ($shares as $idx => $share) {
            $file = Keyfile::seal($election->id, $idx, 'share', [
                'share' => bin2hex($share),
                'share_public_key' => bin2hex(Group::mulBase($share)),
                'joint_public_key' => $election->fresh()->joint_public_key,
            ], $passphrase);
            file_put_contents("{$dir}/election-{$election->id}-trustee-{$idx}.evkey", json_encode($file, JSON_PRETTY_PRINT));
        }
    }

    public function credentialFor(Election $election, User $user): string
    {
        return app(CredentialService::class)->credentialFor($election->id, $user->voter->id);
    }
}
