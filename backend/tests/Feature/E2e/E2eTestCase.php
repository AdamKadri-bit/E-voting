<?php

namespace Tests\Feature\E2e;

use App\Crypto\BallotCrypto;
use App\Models\District;
use App\Models\Election;
use App\Models\Governorate;
use App\Models\User;
use App\Services\Geo\GeoIpResolver;
use Database\Seeders\Support\DemoElectionBuilder;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Admin\AdminTestCase;

/**
 * Shared fixture: one governorate, two constituencies (the first spanning two
 * minor districts), an open end-to-end election with two lists per
 * constituency and district-bound candidates, and a completed 2-of-3 ceremony.
 */
abstract class E2eTestCase extends AdminTestCase
{
    protected DemoElectionBuilder $b;
    protected Election $election;
    protected array $shares;
    protected array $trustees;
    protected District $d1;
    protected District $d2;
    protected District $d3;
    protected int $c1;
    protected int $c2;

    protected function setUp(): void
    {
        parent::setUp();

        // Offline GeoIP stand-in: the test decides what each IP resolves to.
        $this->app->instance(GeoIpResolver::class, new class implements GeoIpResolver {
            public array $map = ['81.2.69.160' => 'GB', '2.2.2.2' => 'FR', '5.5.5.5' => 'DE', '185.1.1.1' => 'LB'];

            public function countryFor(?string $ip): ?string
            {
                return $this->map[$ip] ?? null;
            }
        });

        $this->b = new DemoElectionBuilder();
        $g = Governorate::create(['code' => 'ML', 'name_en' => 'Mount Lebanon', 'name_ar' => 'جبل لبنان']);
        $this->d1 = District::create(['governorate_id' => $g->id, 'code' => 'CHOUF', 'name_en' => 'Chouf', 'name_ar' => 'الشوف']);
        $this->d2 = District::create(['governorate_id' => $g->id, 'code' => 'ALEY', 'name_en' => 'Aley', 'name_ar' => 'عاليه']);
        $this->d3 = District::create(['governorate_id' => $g->id, 'code' => 'METN', 'name_en' => 'Metn', 'name_ar' => 'المتن']);
        $this->c1 = DB::table('constituencies')->insertGetId(['name_en' => 'Chouf–Aley', 'name_ar' => 'الشوف وعاليه', 'code' => 'ML4', 'created_at' => now(), 'updated_at' => now()]);
        $this->c2 = DB::table('constituencies')->insertGetId(['name_en' => 'Metn', 'name_ar' => 'المتن', 'code' => 'ML2', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('constituency_districts')->insert([
            ['constituency_id' => $this->c1, 'district_id' => $this->d1->id, 'created_at' => now(), 'updated_at' => now()],
            ['constituency_id' => $this->c1, 'district_id' => $this->d2->id, 'created_at' => now(), 'updated_at' => now()],
            ['constituency_id' => $this->c2, 'district_id' => $this->d3->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $this->election = $this->makeElection(['title' => 'Open E2E election']);
    }

    protected function layout(): array
    {
        return [
            ['constituency_id' => $this->c1, 'lists' => [
                ['name' => 'Mountain Unity', 'candidates' => [['name' => 'Rami Haddad', 'district_id' => $this->d1->id], ['name' => 'Lina Aoun', 'district_id' => $this->d2->id]]],
                ['name' => 'Civic Change', 'candidates' => [['name' => 'Karim Nasr', 'district_id' => $this->d1->id], ['name' => 'Maya Saad', 'district_id' => $this->d2->id]]],
            ]],
            ['constituency_id' => $this->c2, 'lists' => [
                ['name' => 'Metn First', 'candidates' => [['name' => 'Joe Khoury', 'district_id' => $this->d3->id]]],
                ['name' => 'Metn Forward', 'candidates' => [['name' => 'Nour Salem', 'district_id' => $this->d3->id]]],
            ]],
        ];
    }

    protected function makeElection(array $attrs = [], bool $open = true): Election
    {
        $e = $this->b->election($attrs, $this->layout());
        $this->trustees = [
            User::factory()->create(['role' => 'admin', 'email_verified_at' => now(), 'name' => 'Admin Trustee']),
            User::factory()->create(['role' => 'voter', 'email_verified_at' => now(), 'name' => 'Dr. Ahmad Kassem']),
            User::factory()->create(['role' => 'admin', 'email_verified_at' => now(), 'name' => 'Officer Trustee']),
        ];
        $this->shares = $this->b->simulateCeremony($e, array_map(fn ($u) => $u->id, $this->trustees), 2);

        return $open ? $this->b->open($e) : $e->fresh();
    }

    protected function voter(string $email, District $d, ?string $type = 'resident', ?string $country = null, ?array $elections = null): User
    {
        return $this->b->voter($email, 'Test ' . ucfirst(strtok($email, '@')), $d, $type, $country, $elections ?? [$this->election]);
    }

    protected function listId(string $name): int
    {
        return (int) DB::table('lists')->where('election_id', $this->election->id)->where('list_name_en', $name)->value('id');
    }

    protected function candidacyId(string $name): int
    {
        return (int) DB::table('candidacies')
            ->join('candidate_profiles', 'candidate_profiles.id', '=', 'candidacies.candidate_profile_id')
            ->where('candidacies.election_id', $this->election->id)->where('candidate_profiles.full_name', $name)
            ->value('candidacies.id');
    }

    /** GET the ballot as this user, encrypt locally (PHP stands in for the browser), POST it. */
    protected function castViaApi(User $user, int $listId, ?int $candId, string $ip = '127.0.0.1', ?Election $election = null)
    {
        $election ??= $this->election;
        $this->authenticateAs($user);
        $ballot = $this->withServerVariables(['REMOTE_ADDR' => $ip])->getJson("/api/elections/{$election->id}/ballot")->assertOk()->json('e2e');
        $enc = BallotCrypto::encrypt($ballot['manifest'], $ballot['joint_public_key'], $ballot['credential'], DemoElectionBuilder::selection($ballot['manifest'], $listId, $candId));

        return $this->withServerVariables(['REMOTE_ADDR' => $ip])->postJson("/api/elections/{$election->id}/ballots", ['ballot' => $enc['ballot']]);
    }
}
