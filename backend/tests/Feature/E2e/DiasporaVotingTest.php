<?php

namespace Tests\Feature\E2e;

use App\Models\AuditLog;
use App\Models\ElectionParticipation;
use Illuminate\Support\Facades\Schema;

class DiasporaVotingTest extends E2eTestCase
{
    public function test_diaspora_voter_gets_their_home_district_ballot_with_banner_data(): void
    {
        $u = $this->voter('abroad@x.test', $this->d2, 'diaspora', 'CA');
        $this->authenticateAs($u);

        $r = $this->getJson("/api/elections/{$this->election->id}/ballot")->assertOk();
        $r->assertJsonPath('voter.voter_type', 'diaspora')
            ->assertJsonPath('voter.residence_country_name', 'Canada')
            ->assertJsonPath('district.name', 'Aley')
            ->assertJsonPath('constituency.name', 'Chouf–Aley');

        // Only Aley's candidates are offered for the preferential vote.
        $labels = collect($r->json('e2e.manifest.options'))->where('type', 'candidate')->pluck('label')->all();
        $this->assertEqualsCanonicalizing(['Lina Aoun', 'Maya Saad'], $labels);
    }

    public function test_disabled_diaspora_voting_shows_a_clear_message_and_residents_are_unaffected(): void
    {
        $this->election->update(['diaspora_voting_enabled' => false]);
        $abroad = $this->voter('abroad@x.test', $this->d1, 'diaspora', 'US');
        $home = $this->voter('home@x.test', $this->d1, 'resident');

        $this->authenticateAs($abroad);
        $this->getJson("/api/elections/{$this->election->id}/ballot")
            ->assertStatus(403)->assertJsonPath('reason', 'diaspora_disabled');
        // Posting a ballot directly is refused for the same reason, before any proof is even looked at.
        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => [
            'election_id' => $this->election->id, 'manifest_id' => 1, 'manifest_hash' => str_repeat('0', 64),
            'credential' => str_repeat('0', 64), 'ciphertexts' => [[]], 'option_proofs' => [[]], 'constraint_proofs' => [[]],
        ]])->assertStatus(403)->assertJsonPath('reason', 'diaspora_disabled');

        $this->castViaApi($home, $this->listId('Mountain Unity'), null)->assertCreated();
    }

    public function test_participation_records_declared_and_detected_country_and_flags_mismatch(): void
    {
        $fr = $this->voter('fr@x.test', $this->d1, 'diaspora', 'FR');
        $vpn = $this->voter('vpn@x.test', $this->d1, 'diaspora', 'FR');
        $res = $this->voter('res@x.test', $this->d1, 'resident');

        $this->castViaApi($fr, $this->listId('Civic Change'), null, '2.2.2.2')->assertCreated();
        $this->castViaApi($vpn, $this->listId('Civic Change'), null, '5.5.5.5')->assertCreated();
        $this->castViaApi($res, $this->listId('Civic Change'), null, '185.1.1.1')->assertCreated();

        $rows = ElectionParticipation::where('election_id', $this->election->id)->get()->keyBy('voter_id');
        $this->assertSame(['FR', 'FR', false], [$rows[$fr->voter->id]->declared_country, $rows[$fr->voter->id]->ip_country, $rows[$fr->voter->id]->location_mismatch]);
        $this->assertSame(['FR', 'DE', true], [$rows[$vpn->voter->id]->declared_country, $rows[$vpn->voter->id]->ip_country, $rows[$vpn->voter->id]->location_mismatch]);
        $this->assertSame(['LB', 'LB', false], [$rows[$res->voter->id]->declared_country, $rows[$res->voter->id]->ip_country, $rows[$res->voter->id]->location_mismatch]);

        // A mismatch never blocks: all three were counted.
        $this->assertSame(3, $this->election->e2eBallots()->where('status', 'counted')->count());
    }

    public function test_raw_ip_is_discarded_and_participation_time_is_coarse(): void
    {
        $u = $this->voter('ip@x.test', $this->d1, 'diaspora', 'GB');
        $this->castViaApi($u, $this->listId('Mountain Unity'), null, '81.2.69.160')->assertCreated();

        $p = ElectionParticipation::first();
        $this->assertSame(0, (int) $p->coarse_timestamp->format('i'));
        $this->assertSame(0, (int) $p->coarse_timestamp->format('s'));
        $this->assertFalse(Schema::hasColumn('election_participations', 'ip_address'));

        foreach (AuditLog::all() as $log) {
            $this->assertNotSame('81.2.69.160', $log->ip_address);
            $this->assertStringNotContainsString('81.2.69.160', json_encode($log->metadata_json));
        }
    }
}
