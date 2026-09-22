<?php

namespace Tests\Feature\Admin;

use App\Models\Candidacy;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;

class ElectionActivationTest extends AdminTestCase
{
    /** Builds an election that passes every readiness check (key ceremony included). */
    private function completeElection(array $attributes = []): Election
    {
        $election = Election::factory()->keyed()->create(array_merge([
            'status' => 'draft',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(12),
        ], $attributes));

        $constituency = Constituency::factory()->create();
        $election->constituencies()->attach($constituency->id);

        $list = ElectionList::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);

        $candidacy = Candidacy::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
            'status' => 'accepted',
        ]);

        ListCandidate::create([
            'list_id' => $list->id,
            'candidacy_id' => $candidacy->id,
        ]);

        return $election;
    }

    public function test_complete_election_can_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = $this->completeElection();

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active'])
            ->assertOk();

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'active']);
    }

    public function test_election_without_a_key_ceremony_cannot_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = $this->completeElection(['key_ceremony_status' => 'pending', 'joint_public_key' => null]);

        $response = $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active']);

        $response->assertStatus(422);
        $this->assertStringContainsString('key ceremony', implode(' ', $response->json('blockers')));
        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'draft']);
    }

    public function test_activation_freezes_the_ballot_styles(): void
    {
        $this->loginAsAdmin();

        $election = $this->completeElection();
        $district = \App\Models\District::create(['governorate_id' => \App\Models\Governorate::create(['code' => 'G', 'name_en' => 'G', 'name_ar' => 'G'])->id, 'code' => 'D', 'name_en' => 'D', 'name_ar' => 'D']);
        \Illuminate\Support\Facades\DB::table('constituency_districts')->insert([
            'constituency_id' => $election->constituencies()->first()->id, 'district_id' => $district->id,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active'])->assertOk();

        $this->assertDatabaseCount('ballot_manifests', 1);
    }

    public function test_legacy_election_needs_no_key_ceremony(): void
    {
        $this->loginAsAdmin();

        $election = $this->completeElection(['crypto_scheme' => 'legacy', 'key_ceremony_status' => 'pending', 'joint_public_key' => null]);

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active'])->assertOk();
    }

    public function test_election_without_lists_cannot_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create([
            'status' => 'draft',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(12),
        ]);
        $election->constituencies()->attach(Constituency::factory()->create()->id);

        $response = $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active']);

        $response->assertStatus(422);
        $response->assertJsonPath('readiness.ready', false);

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'draft']);
    }

    public function test_election_whose_list_has_no_candidates_cannot_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create([
            'status' => 'draft',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(12),
        ]);
        $constituency = Constituency::factory()->create();
        $election->constituencies()->attach($constituency->id);

        ElectionList::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);

        $response = $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active']);

        $response->assertStatus(422);

        $blockers = $response->json('blockers');
        $this->assertNotEmpty(array_filter(
            $blockers,
            fn ($blocker) => str_contains($blocker, 'No accepted candidates on')
        ));

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'draft']);
    }

    public function test_election_without_constituencies_cannot_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create([
            'status' => 'draft',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHours(12),
        ]);

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active'])
            ->assertStatus(422);

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'draft']);
    }

    public function test_election_whose_window_already_ended_cannot_be_activated(): void
    {
        $this->loginAsAdmin();

        $election = $this->completeElection([
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDay(),
        ]);

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'active'])
            ->assertStatus(422);

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'draft']);
    }

    public function test_index_reports_readiness_per_election(): void
    {
        $this->loginAsAdmin();

        $ready = $this->completeElection();

        $response = $this->getJson('/api/admin/elections');

        $response->assertOk();

        $row = collect($response->json('elections'))->firstWhere('id', $ready->id);

        $this->assertTrue($row['readiness']['ready']);
        $this->assertSame([], $row['readiness']['blockers']);
    }

    public function test_closing_an_election_needs_no_readiness(): void
    {
        // Only activation is gated — an incomplete draft can still be closed.
        $this->loginAsAdmin();

        $election = Election::factory()->create(['status' => 'draft']);

        $this->patchJson("/api/admin/elections/{$election->id}/status", ['status' => 'closed'])
            ->assertOk();

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'closed']);
    }
}
