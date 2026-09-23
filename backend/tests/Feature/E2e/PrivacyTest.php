<?php

namespace Tests\Feature\E2e;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Schema;

/**
 * "No API response or query links a country or user to a plaintext vote choice."
 */
class PrivacyTest extends E2eTestCase
{
    public function test_ballot_table_has_no_identity_or_time_columns(): void
    {
        $cols = Schema::getColumnListing('e2e_ballots');
        foreach (['user_id', 'voter_id', 'created_at', 'updated_at', 'cast_at', 'ip_address', 'country', 'voter_type'] as $c) {
            $this->assertNotContains($c, $cols, "e2e_ballots must not have {$c}");
        }
        $this->assertNotContains('list_id', Schema::getColumnListing('election_participations'));
    }

    public function test_no_response_pairs_a_person_or_country_with_a_choice(): void
    {
        $u = $this->voter('p@x.test', $this->d1, 'diaspora', 'FR');
        $this->castViaApi($u, $this->listId('Civic Change'), $this->candidacyId('Karim Nasr'), '2.2.2.2')->assertCreated();
        $listId = $this->listId('Civic Change');
        $candId = $this->candidacyId('Karim Nasr');

        $responses = [];
        $this->authenticateAs($u);
        $responses['me'] = $this->getJson('/api/me')->json();
        $responses['elections'] = $this->getJson('/api/elections')->json();
        $responses['ballot'] = $this->getJson("/api/elections/{$this->election->id}/ballot")->json();
        $responses['board'] = $this->getJson("/api/board/elections/{$this->election->id}")->json();
        $responses['export'] = $this->getJson("/api/board/elections/{$this->election->id}/export")->json();
        $responses['turnout'] = $this->getJson("/api/elections/{$this->election->id}/turnout")->json();
        $this->loginAsAdmin();
        $responses['participation'] = $this->getJson("/api/admin/elections/{$this->election->id}/participation")->json();
        $responses['results'] = $this->getJson("/api/admin/elections/{$this->election->id}/results")->json();

        // Nothing on the board names the voter or their country.
        $board = json_encode($responses['export']);
        $this->assertStringNotContainsString('p@x.test', $board);
        $this->assertStringNotContainsString('"FR"', $board);
        $this->assertStringNotContainsString('"voter_id"', $board);
        $this->assertStringNotContainsString('cast_at', $board);

        // Responses that do know the voter/country carry no choice.
        foreach (['me', 'elections', 'turnout', 'participation'] as $k) {
            $json = json_encode($responses[$k]);
            $this->assertStringNotContainsString('"selections"', $json, $k);
            $this->assertStringNotContainsString('"list_id":' . $listId, $json, $k);
            $this->assertStringNotContainsString('"candidacy_id":' . $candId, $json, $k);
        }

        // Before decryption there are no results at all.
        $this->assertSame([], $responses['results']['lists']);

        // The cast left no plaintext choice in the audit log either.
        foreach (AuditLog::all() as $log) {
            $meta = json_encode($log->metadata_json);
            $this->assertStringNotContainsString('list_id', $meta);
        }
    }

    public function test_ballot_ordering_is_not_exposed_as_time(): void
    {
        $u = $this->voter('t@x.test', $this->d1);
        $this->castViaApi($u, $this->listId('Mountain Unity'), null)->assertCreated();
        $row = $this->getJson("/api/board/elections/{$this->election->id}/ballots")->json('data.0');
        $this->assertSame(['sequence', 'tracking_code', 'short_code', 'status', 'ballot'], array_keys($row));
    }
}
