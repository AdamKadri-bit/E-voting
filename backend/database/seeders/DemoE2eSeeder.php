<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Election;
use App\Models\ElectionParticipation;
use App\Models\User;
use App\Services\E2e\KeyCeremonyService;
use Database\Seeders\Support\DemoElectionBuilder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for the diaspora + end-to-end verifiable voting features.
 *
 * Accounts (all passwords documented in README → "Demo accounts"):
 *   admin@evoting.local / Admin123!           administrator, trustee 1
 *   kassem@evoting.local / Trustee123!        Dr. Ahmad Kassem, trustee 2
 *   officer@evoting.local / Admin123!         election officer, trustee 3
 *   resident@evoting.local / Password123!     resident voter (Chouf), hasn't voted in the open election
 *   diaspora@evoting.local / Password123!     diaspora voter in France (Aley), hasn't voted yet
 *   newvoter@evoting.local / Password123!     voter who hasn't chosen resident/diaspora yet and
 *                                             hasn't linked the voter registry (ID scan / OCR) yet
 *
 * Seeded demo trustee key files (passphrase "demo trustee passphrase") are
 * written to storage/app/demo-trustee-keyfiles/ so the decryption ceremony can
 * be demonstrated. They exist only because the seeder simulated the ceremony;
 * see DemoElectionBuilder for why that is demo-only.
 */
class DemoE2eSeeder extends Seeder
{
    public const KEYFILE_PASSPHRASE = 'demo trustee passphrase';

    private const COUNTRIES = ['FR', 'US', 'CA', 'AU', 'DE', 'AE', 'BR', 'SA', 'GB', 'CI', 'SE', 'NG', 'QA', 'MX'];

    public function run(): void
    {
        if (Election::where('title', 'like', '%(Demo)%')->exists()) {
            $this->command?->info('Demo e2e elections already seeded — skipping.');

            return;
        }

        $b = new DemoElectionBuilder();
        $chouf = District::where('name_en', 'Chouf')->firstOrFail();
        $aley = District::where('name_en', 'Aley')->firstOrFail();
        $keserwan = District::where('name_en', 'Keserwan')->firstOrFail();
        $jbeil = District::where('name_en', 'Jbeil')->firstOrFail();
        $choufAley = (int) DB::table('constituency_districts')->where('district_id', $chouf->id)->value('constituency_id');
        $kesJbeil = (int) DB::table('constituency_districts')->where('district_id', $keserwan->id)->value('constituency_id');

        $layout = [
            ['constituency_id' => $choufAley, 'lists' => [
                ['name' => 'Mountain Unity', 'name_ar' => 'وحدة الجبل', 'candidates' => [
                    ['name' => 'Rami Haddad', 'district_id' => $chouf->id], ['name' => 'Lina Aoun', 'district_id' => $aley->id], ['name' => 'Fadi Karam', 'district_id' => $chouf->id],
                ]],
                ['name' => 'Civic Change', 'name_ar' => 'التغيير المدني', 'candidates' => [
                    ['name' => 'Karim Nasr', 'district_id' => $chouf->id], ['name' => 'Maya Saad', 'district_id' => $aley->id],
                ]],
                ['name' => 'Cedar Future', 'name_ar' => 'مستقبل الأرز', 'candidates' => [
                    ['name' => 'Hala Zein', 'district_id' => $aley->id], ['name' => 'Tony Abi Khalil', 'district_id' => $chouf->id],
                ]],
            ]],
            ['constituency_id' => $kesJbeil, 'lists' => [
                ['name' => 'Coast & Mountain', 'name_ar' => 'الساحل والجبل', 'candidates' => [
                    ['name' => 'Joe Khoury', 'district_id' => $keserwan->id], ['name' => 'Rita Semaan', 'district_id' => $jbeil->id],
                ]],
                ['name' => 'Jbeil Forward', 'name_ar' => 'جبيل إلى الأمام', 'candidates' => [
                    ['name' => 'Nour Salem', 'district_id' => $jbeil->id], ['name' => 'Elie Mansour', 'district_id' => $keserwan->id],
                ]],
            ]],
        ];

        $trustees = $this->trustees();
        $trusteeIds = array_map(fn ($u) => $u->id, $trustees);
        $districts = [$chouf, $aley, $keserwan, $jbeil];

        /* 1. Open election: live turnout + map, re-votes, audits. */
        $open = $b->election(['title' => '2026 Parliamentary Election (Demo)', 'starts_at' => now()->subHours(6)->startOfHour(), 'ends_at' => now()->addDays(5)], $layout);
        $shares = $b->simulateCeremony($open, $trusteeIds, 2);
        $open = $b->open($open);
        $b->writeKeyfiles($open, $shares, self::KEYFILE_PASSPHRASE, (string) config('evoting.demo_keyfile_dir'));

        /* 2. Closed + decrypted election: results with "Verified". */
        $closed = $b->election(['title' => '2025 Municipal Pilot (Demo, results published)', 'type' => 'municipal', 'starts_at' => now()->subDays(20)->setTime(7, 0), 'ends_at' => now()->subDays(19)->setTime(19, 0)], $layout);
        $closedShares = $b->simulateCeremony($closed, $trusteeIds, 2);
        $closed->update(['status' => 'active', 'ends_at' => now()->addHour()]);
        $b->open($closed);

        /* 3. Draft waiting for its key ceremony (trustees assigned, nothing run). */
        $draft = $b->election(['title' => '2027 By-election (Demo, key ceremony pending)', 'starts_at' => now()->addDays(30)->setTime(7, 0), 'ends_at' => now()->addDays(30)->setTime(19, 0)], $layout);
        app(KeyCeremonyService::class)->assign($draft, $trusteeIds, 2, null);

        /* 4. Open election with diaspora voting switched off. */
        $noDiaspora = $b->election(['title' => 'Municipal Run-off (Demo, diaspora voting disabled)', 'type' => 'municipal', 'diaspora_voting_enabled' => false, 'starts_at' => now()->subHours(3), 'ends_at' => now()->addDays(2)], $layout);
        $b->simulateCeremony($noDiaspora, $trusteeIds, 2);
        $b->open($noDiaspora);

        $all = [$open, $closed, $draft, $noDiaspora];

        /* Demo login accounts. */
        $b->voter('resident@evoting.local', 'Samir Resident', $chouf, 'resident', null, $all);
        $b->voter('diaspora@evoting.local', 'Nadia Diaspora', $aley, 'diaspora', 'FR', $all);
        // Not yet linked to the voter registry: shows the ID-scan / OCR step (/verify-voter).
        $b->voter('newvoter@evoting.local', 'Walid Newvoter', $keserwan, null, null, $all, 'Password123!', false);

        /* Crowd: residents and diaspora in 14 countries, non-voters, mismatches, re-votes, audits. */
        $lists = fn (Election $e) => DB::table('lists')->where('election_id', $e->id)->get(['id', 'constituency_id'])->groupBy('constituency_id');
        $cands = fn (Election $e) => DB::table('candidacies')->join('list_candidates', 'list_candidates.candidacy_id', '=', 'candidacies.id')
            ->where('candidacies.election_id', $e->id)->get(['candidacies.id', 'candidacies.district_id', 'list_candidates.list_id']);

        foreach ([$open, $closed] as $e) {
            $l = $lists($e);
            $c = $cands($e);
            mt_srand($e->id * 7919);
            for ($i = 0; $i < 60; $i++) {
                $d = $districts[$i % 4];
                $diaspora = $i % 3 !== 0;
                $country = $diaspora ? self::COUNTRIES[$i % count(self::COUNTRIES)] : null;
                $u = $b->voter("demo{$e->id}-{$i}@voters.local", "Demo Voter{$i}", $d, $diaspora ? 'diaspora' : 'resident', $country, [$e]);

                if ($i >= 50) {
                    continue; // on the roll, never voted — must not show on the map
                }
                $cid = (int) DB::table('constituency_districts')->where('district_id', $d->id)->value('constituency_id');
                $list = $l[$cid][mt_rand(0, count($l[$cid]) - 1)]->id;
                $options = $c->where('list_id', $list)->where('district_id', $d->id)->values();
                $cand = ($options->isNotEmpty() && mt_rand(0, 3) > 0) ? $options[mt_rand(0, $options->count() - 1)]->id : null;

                // Detected country: usually the declared one; every 7th is a VPN/traveller mismatch; some unknown.
                $declared = $country ?? 'LB';
                $detected = $i % 11 === 5 ? null : ($i % 7 === 3 ? 'DE' : $declared);
                $b->cast($e, $u, $list, $cand, $detected);

                if ($i % 9 === 4) {
                    $other = $l[$cid][($l[$cid]->search(fn ($x) => $x->id === $list) + 1) % count($l[$cid])]->id;
                    $b->cast($e, $u, $other, null); // re-vote: supersedes the first ballot
                }
                if ($i % 13 === 6) {
                    $b->audit($e, $u, $list, null); // a Benaloh audit published to the board
                }
            }

            // Spread participation over the voting hours (they were all cast "now" by the seeder).
            $start = $e->starts_at->copy()->startOfHour();
            $span = max(1, (int) min(12, $start->diffInHours(min(now(), $e->ends_at))));
            ElectionParticipation::where('election_id', $e->id)->get()->each(function ($p, $k) use ($start, $span) {
                $p->update(['coarse_timestamp' => $start->copy()->addHours($k % $span)]);
            });
        }

        $b->closeAndDecrypt($closed, $closedShares, [1, 2]);
        $closed->update(['starts_at' => now()->subDays(20)->setTime(7, 0), 'ends_at' => now()->subDays(20)->setTime(19, 0)]);

        $this->command?->info('Demo e2e elections seeded. Trustee key files: ' . config('evoting.demo_keyfile_dir') . ' (passphrase: "' . self::KEYFILE_PASSPHRASE . '").');
    }

    /** @return User[] admin, Dr. Kassem, election officer — the default 2-of-3 trustees. */
    private function trustees(): array
    {
        $admin = User::where('email', 'admin@evoting.local')->first() ?? User::create([
            'name' => 'System Administrator', 'email' => 'admin@evoting.local', 'password' => Hash::make('Admin123!'), 'role' => 'admin',
        ]);
        $admin->forceFill(['email_verified_at' => $admin->email_verified_at ?? now(), 'role' => 'admin'])->save();

        $kassem = User::firstOrCreate(['email' => 'kassem@evoting.local'], [
            'name' => 'Dr. Ahmad Kassem', 'password' => Hash::make('Trustee123!'), 'role' => 'voter', 'verification_status' => 'account_created', 'can_vote' => false,
        ]);
        $kassem->forceFill(['email_verified_at' => now()])->save();

        $officer = User::firstOrCreate(['email' => 'officer@evoting.local'], [
            'name' => 'Election Officer', 'password' => Hash::make('Admin123!'), 'role' => 'admin', 'verification_status' => 'account_created', 'can_vote' => false,
        ]);
        $officer->forceFill(['email_verified_at' => now()])->save();

        return [$admin, $kassem, $officer];
    }
}
