<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Candidacy;
use App\Models\Constituency;
use App\Models\Election;
use App\Models\ElectionList;
use App\Models\ListCandidate;

class AuditLogCallsTest extends AdminTestCase
{
    public function test_adding_candidate_to_list_logs_audit_entry(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create();
        $constituency = Constituency::factory()->create();
        $list = ElectionList::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);
        $candidacy = Candidacy::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);

        $response = $this->postJson("/api/admin/lists/{$list->id}/candidates", [
            'candidacy_id' => $candidacy->id,
        ]);

        $response->assertCreated();

        $entry = AuditLog::where('action', 'admin.list.candidate_added')->latest('id')->first();
        $this->assertNotNull($entry);
        $this->assertSame($list->id, $entry->metadata_json['list_id']);
        $this->assertSame($candidacy->id, $entry->metadata_json['candidacy_id']);
    }

    public function test_removing_candidate_from_list_logs_audit_entry(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create();
        $constituency = Constituency::factory()->create();
        $list = ElectionList::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);
        $candidacy = Candidacy::factory()->create([
            'election_id' => $election->id,
            'constituency_id' => $constituency->id,
        ]);
        $membership = ListCandidate::create([
            'list_id' => $list->id,
            'candidacy_id' => $candidacy->id,
        ]);

        $response = $this->deleteJson("/api/admin/lists/{$list->id}/candidates/{$membership->id}");

        $response->assertOk();

        $entry = AuditLog::where('action', 'admin.list.candidate_removed')->latest('id')->first();
        $this->assertNotNull($entry);
        $this->assertSame($list->id, $entry->metadata_json['list_id']);
        $this->assertSame($candidacy->id, $entry->metadata_json['candidacy_id']);
    }

    public function test_updating_list_logs_audit_entry(): void
    {
        $this->loginAsAdmin();

        $list = ElectionList::factory()->create();

        $response = $this->putJson("/api/admin/lists/{$list->id}", [
            'list_name_en' => 'Renamed list',
        ]);

        $response->assertOk();

        $entry = AuditLog::where('action', 'admin.list.updated')->latest('id')->first();
        $this->assertNotNull($entry);
        $this->assertSame($list->id, $entry->metadata_json['list_id']);
    }

    public function test_candidacy_status_change_logs_audit_entry(): void
    {
        $this->loginAsAdmin();

        $candidacy = Candidacy::factory()->create(['status' => 'pending']);

        $response = $this->patchJson("/api/admin/candidacies/{$candidacy->id}/status", [
            'status' => 'accepted',
        ]);

        $response->assertOk();

        $entry = AuditLog::where('action', 'admin.candidacy.status_changed')->latest('id')->first();
        $this->assertNotNull($entry);
        $this->assertSame($candidacy->id, $entry->metadata_json['candidacy_id']);
        $this->assertSame('accepted', $entry->metadata_json['status']);
    }

    public function test_audit_log_chain_links_to_previous_entry_hash(): void
    {
        $this->loginAsAdmin();

        $list = ElectionList::factory()->create();

        $this->putJson("/api/admin/lists/{$list->id}", ['list_name_en' => 'First'])->assertOk();
        $first = AuditLog::where('action', 'admin.list.updated')->latest('id')->first();

        $this->putJson("/api/admin/lists/{$list->id}", ['list_name_en' => 'Second'])->assertOk();
        $second = AuditLog::where('action', 'admin.list.updated')->latest('id')->first();

        $this->assertSame($first->entry_hash, $second->prev_hash);
    }
}
