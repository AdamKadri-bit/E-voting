<?php

namespace Tests\Feature\Admin;

use App\Models\Candidacy;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;

class ElectionActivationTest extends AdminTestCase
{
    /** Builds an election that passes every readiness check. */
    private function completeElection(array $attributes = []): Election
    {
        $election = Election::factory()->create(array_merge([
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
