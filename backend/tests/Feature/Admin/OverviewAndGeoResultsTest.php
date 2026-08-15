<?php

namespace Tests\Feature\Admin;

use App\Models\Candidacy;
use App\Models\Constituency;
use App\Models\District;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ElectoralRollEntry;
use App\Models\EncryptedBallot;
use App\Models\Governorate;
use App\Models\ListCandidate;
use App\Models\User;
use App\Models\Voter;
use App\Models\VoterElectionStatus;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

class OverviewAndGeoResultsTest extends AdminTestCase
{
    private Election $election;
    private Constituency $constituency;
    private Governorate $governorate;
    private District $district;
    private ElectionList $list;
    private Candidacy $candidacy;

    protected function setUp(): void
    {
        parent::setUp();

        $this->governorate = Governorate::create([
            'code' => 'MOUNT_LEBANON',
            'name_en' => 'Mount Lebanon',
            'name_ar' => 'جبل لبنان',
        ]);

        $this->district = District::create([
            'governorate_id' => $this->governorate->id,
            'code' => 'MATN',
            'name_en' => 'Metn',
            'name_ar' => 'المتن',
        ]);

        $this->constituency = Constituency::factory()->create(['name_en' => 'Metn']);

        DB::table('constituency_districts')->insert([
            'constituency_id' => $this->constituency->id,
            'district_id' => $this->district->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->election = Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);
        $this->election->constituencies()->attach($this->constituency->id);

        $this->list = ElectionList::factory()->create([
            'election_id' => $this->election->id,
            'constituency_id' => $this->constituency->id,
            'list_name_en' => 'Unity List',
        ]);

        $this->candidacy = Candidacy::factory()->create([
            'election_id' => $this->election->id,
            'constituency_id' => $this->constituency->id,
            'status' => 'accepted',
        ]);

        ListCandidate::create([
            'list_id' => $this->list->id,
            'candidacy_id' => $this->candidacy->id,
        ]);
    }

    private function seedRollAndVotes(int $registered, int $voted, int $ballots): void
    {
        for ($i = 0; $i < $registered; $i++) {
            ElectoralRollEntry::create([
                'election_id' => $this->election->id,
                'national_id_number' => "ROLL-{$i}",
                'first_name' => 'First',
                'father_name' => 'Father',
                'last_name' => 'Last',
                'date_of_birth' => '1990-01-01',
                'registered_governorate_id' => $this->governorate->id,
                'registered_district_id' => $this->district->id,
            ]);
        }

        for ($i = 0; $i < $voted; $i++) {
            $voter = Voter::create([
                'user_id' => User::factory()->create(['role' => 'voter'])->id,
                'national_id_number' => "VOTER-{$i}",
                'first_name' => 'First',
                'father_name' => 'Father',
                'last_name' => 'Last',
                'date_of_birth' => '1990-01-01',
                'registered_governorate_id' => $this->governorate->id,
                'registered_district_id' => $this->district->id,
            ]);

            VoterElectionStatus::create([
                'voter_id' => $voter->id,
                'election_id' => $this->election->id,
                'has_voted' => true,
                'voted_at' => now(),
            ]);
        }

        for ($i = 0; $i < $ballots; $i++) {
            EncryptedBallot::factory()->create([
                'election_id' => $this->election->id,
                'constituency_id' => $this->constituency->id,
                'encrypted_payload' => Crypt::encrypt(json_encode([
                    'list_id' => $this->list->id,
                    'preferential_candidacy_id' => $this->candidacy->id,
                ])),
            ]);
        }
    }

    public function test_overview_index_returns_only_the_election_list(): void
    {
        $this->loginAsAdmin();

        $response = $this->getJson('/api/admin/overview');

        $response->assertOk();
        $response->assertJsonStructure(['elections' => [['id', 'title', 'status', 'starts_at', 'ends_at']]]);
        // The figures now belong to a selected election, not the index.
        $response->assertJsonMissingPath('counts');
        $response->assertJsonMissingPath('chain');
    }

    public function test_overview_show_returns_the_selected_elections_figures(): void
    {
        $this->loginAsAdmin();
        $this->seedRollAndVotes(registered: 10, voted: 4, ballots: 4);

        $response = $this->getJson("/api/admin/overview/elections/{$this->election->id}");

        $response->assertOk();
        $response->assertJsonPath('election.id', $this->election->id);
        $response->assertJsonPath('counts.lists', 1);
        $response->assertJsonPath('counts.constituencies', 1);
        $response->assertJsonPath('counts.candidacies_accepted', 1);
        $response->assertJsonPath('counts.ballots', 4);
        $response->assertJsonPath('turnout.registered', 10);
        $response->assertJsonPath('turnout.voted', 4);
        $response->assertJsonPath('turnout.turnout_percentage', 40);
        $response->assertJsonPath('readiness.ready', true);
    }

    public function test_overview_show_is_admin_only(): void
    {
        $this->getJson("/api/admin/overview/elections/{$this->election->id}")
            ->assertStatus(401);
    }

    public function test_geo_results_break_totals_down_by_governorate(): void
    {
        $this->loginAsAdmin();
        $this->seedRollAndVotes(registered: 20, voted: 5, ballots: 5);

        $response = $this->getJson("/api/admin/elections/{$this->election->id}/geo-results");

        $response->assertOk();
        $response->assertJsonPath('totals.registered', 20);
        $response->assertJsonPath('totals.voted', 5);
        $response->assertJsonPath('totals.ballots', 5);
        $response->assertJsonPath('totals.turnout_percentage', 25);

        $mountLebanon = collect($response->json('governorates'))
            ->firstWhere('code', 'MOUNT_LEBANON');

        $this->assertTrue($mountLebanon['in_election']);
        $this->assertSame(20, $mountLebanon['registered']);
        $this->assertSame(5, $mountLebanon['voted']);
        $this->assertSame(25, $mountLebanon['turnout_percentage']);
        $this->assertSame('Unity List', $mountLebanon['lists'][0]['list_name']);
        $this->assertSame(5, $mountLebanon['lists'][0]['votes']);
        $this->assertSame(5, $mountLebanon['preferential_candidates'][0]['votes']);

        $constituency = $mountLebanon['constituencies'][0];
        $this->assertSame($this->constituency->id, $constituency['id']);
        $this->assertSame(5, $constituency['ballots']);
        $this->assertSame(5, $constituency['lists'][0]['votes']);
    }

    public function test_a_district_shared_by_two_constituencies_is_counted_once(): void
    {
        // Beirut I and Beirut II both cover the Beirut district: the roll can't
        // say which of the two a voter belongs to, so the governorate total
        // must come off the roll rather than summing the constituencies.
        $this->loginAsAdmin();

        $second = Constituency::factory()->create(['name_en' => 'Metn II']);
        $this->election->constituencies()->attach($second->id);

        DB::table('constituency_districts')->insert([
            'constituency_id' => $second->id,
            'district_id' => $this->district->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->seedRollAndVotes(registered: 10, voted: 4, ballots: 0);

        $response = $this->getJson("/api/admin/elections/{$this->election->id}/geo-results");

        $response->assertOk();
        $response->assertJsonPath('totals.registered', 10);
        $response->assertJsonPath('totals.voted', 4);

        $governorate = collect($response->json('governorates'))->firstWhere('code', 'MOUNT_LEBANON');

        $this->assertSame(10, $governorate['registered']);
        $this->assertSame(4, $governorate['voted']);

        foreach ($governorate['constituencies'] as $constituency) {
            $this->assertFalse($constituency['registration_attributable']);
            $this->assertNull($constituency['registered']);
            $this->assertNull($constituency['turnout_percentage']);
        }
    }

    public function test_geo_results_mark_governorates_outside_the_election(): void
    {
        $this->loginAsAdmin();

        $absent = Governorate::create([
            'code' => 'AKKAR',
            'name_en' => 'Akkar',
            'name_ar' => 'عكار',
        ]);

        $response = $this->getJson("/api/admin/elections/{$this->election->id}/geo-results");

        $response->assertOk();

        $row = collect($response->json('governorates'))->firstWhere('id', $absent->id);

        $this->assertFalse($row['in_election']);
        $this->assertSame(0, $row['ballots']);
        $this->assertSame([], $row['constituencies']);
    }

    public function test_geo_results_never_expose_ballot_payloads(): void
    {
        $this->loginAsAdmin();
        $this->seedRollAndVotes(registered: 3, voted: 2, ballots: 2);

        $response = $this->getJson("/api/admin/elections/{$this->election->id}/geo-results");

        $response->assertOk();
        $this->assertStringNotContainsString('encrypted_payload', $response->getContent());
        $this->assertStringNotContainsString('receipt_hash', $response->getContent());
    }

    public function test_geo_results_are_admin_only(): void
    {
        $this->getJson("/api/admin/elections/{$this->election->id}/geo-results")
            ->assertStatus(401);
    }
}
