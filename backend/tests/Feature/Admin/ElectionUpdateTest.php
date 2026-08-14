<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Election;
use App\Models\User;

class ElectionUpdateTest extends AdminTestCase
{
    public function test_admin_can_update_election_core_fields(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create([
            'title' => 'Original title',
            'status' => 'draft',
        ]);

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'law_ref' => 'Law 44/2017',
            'title' => 'Updated title',
            'description' => 'Updated description',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]);

        $response->assertOk();
        $response->assertJsonPath('election.title', 'Updated title');

        $this->assertDatabaseHas('elections', [
            'id' => $election->id,
            'title' => 'Updated title',
            'status' => 'draft',
        ]);
    }

    public function test_status_in_update_payload_is_ignored(): void
    {
        // Regression guard: update() must never let `status` through, since
        // updateStatus() is the only place the activation guard (voting
        // window + >=1 constituency) is enforced.
        $this->loginAsAdmin();

        $election = Election::factory()->create(['status' => 'draft']);

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'law_ref' => 'Law 44/2017',
            'title' => 'Still draft',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
            'status' => 'active',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('elections', [
            'id' => $election->id,
            'status' => 'draft',
        ]);
    }

    public function test_update_requires_title(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create();

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]);

        $response->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $election = Election::factory()->create();

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'title' => 'Nope',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]);

        $response->assertStatus(401);
    }

    public function test_non_admin_request_is_rejected(): void
    {
        $voter = User::factory()->create([
            'role' => 'voter',
            'email_verified_at' => now(),
        ]);
        $this->authenticateAs($voter);

        $election = Election::factory()->create();

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'title' => 'Nope',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]);

        $response->assertStatus(403);
    }

    public function test_update_creates_chained_audit_log_entry(): void
    {
        $admin = $this->loginAsAdmin();

        $election = Election::factory()->create();

        $priorLast = AuditLog::query()->orderByDesc('id')->first();

        $response = $this->putJson("/api/admin/elections/{$election->id}", [
            'type' => 'parliamentary',
            'title' => 'Chained update',
            'starts_at' => now()->addDay()->toDateTimeString(),
            'ends_at' => now()->addDays(2)->toDateTimeString(),
        ]);

        $response->assertOk();

        $entry = AuditLog::query()->where('action', 'admin.election.updated')->latest('id')->first();

        $this->assertNotNull($entry);
        $this->assertSame($election->id, $entry->metadata_json['election_id']);
        $this->assertSame($admin->id, $entry->actor_user_id);
        $this->assertSame($priorLast?->entry_hash, $entry->prev_hash);
    }
}
