<?php

namespace Tests\Feature\E2e;

class ParticipationMapTest extends E2eTestCase
{
    public function test_map_counts_voters_of_this_election_only(): void
    {
        $other = $this->makeElection(['title' => 'Other election']);
        $countries = ['FR', 'FR', 'DE', 'US', 'CA', 'AU', 'AE', 'BR', 'SE'];
        foreach ($countries as $i => $c) {
            $u = $this->voter("d{$i}@x.test", $this->d1, 'diaspora', $c, [$this->election, $other]);
            $this->castViaApi($u, $this->listId('Mountain Unity'), null)->assertCreated();
        }
        $this->castViaApi($this->voter('r1@x.test', $this->d1, 'resident'), $this->listId('Civic Change'), null)->assertCreated();

        // Registered users who never voted, and voters of the other election only, must not appear.
        $this->voter('nonvoter@x.test', $this->d1, 'diaspora', 'JP');
        $elsewhere = $this->voter('elsewhere@x.test', $this->d1, 'diaspora', 'MX', [$other]);
        $lists = \DB::table('lists')->where('election_id', $other->id)->where('list_name_en', 'Mountain Unity')->value('id');
        $this->castViaApi($elsewhere, (int) $lists, null, '127.0.0.1', $other)->assertCreated();

        $this->loginAsAdmin();
        $r = $this->getJson("/api/admin/elections/{$this->election->id}/participation")->assertOk();
        $this->assertSame(10, $r->json('totals.voters'));
        $this->assertSame(9, $r->json('totals.diaspora'));
        $this->assertSame(1, $r->json('totals.resident'));
        $codes = collect($r->json('countries'))->pluck('voters', 'code')->all();
        $this->assertSame(2, $codes['FR']);
        $this->assertSame(1, $codes['LB']);
        $this->assertArrayNotHasKey('JP', $codes);
        $this->assertArrayNotHasKey('MX', $codes);
        $this->assertGreaterThanOrEqual(8, count($codes) - 1);
    }

    public function test_detected_mode_and_admin_only_mismatch_count(): void
    {
        $a = $this->voter('a@x.test', $this->d1, 'diaspora', 'FR');
        $b = $this->voter('b@x.test', $this->d1, 'diaspora', 'FR');
        $this->castViaApi($a, $this->listId('Mountain Unity'), null, '2.2.2.2')->assertCreated();
        $this->castViaApi($b, $this->listId('Mountain Unity'), null, '5.5.5.5')->assertCreated();

        $this->loginAsAdmin();
        $admin = $this->getJson("/api/admin/elections/{$this->election->id}/participation?mode=detected")->assertOk();
        $this->assertSame('detected', $admin->json('mode'));
        $this->assertSame(1, $admin->json('totals.location_mismatches'));
        $this->assertEqualsCanonicalizing(['FR', 'DE'], collect($admin->json('countries'))->pluck('code')->all());

        $public = $this->getJson("/api/elections/{$this->election->id}/turnout")->assertOk();
        $this->assertSame('declared', $public->json('mode'));
        $this->assertArrayNotHasKey('location_mismatches', $public->json('totals'));
    }

    public function test_public_map_suppresses_small_cells(): void
    {
        $this->castViaApi($this->voter('lone@x.test', $this->d1, 'diaspora', 'IS'), $this->listId('Mountain Unity'), null)->assertCreated();
        $public = $this->getJson("/api/elections/{$this->election->id}/turnout")->assertOk();
        $row = collect($public->json('countries'))->firstWhere('code', 'IS');
        $this->assertTrue($row['suppressed']);
        $this->assertNull($row['voters']);
        $this->assertSame(1, $public->json('totals.voters'));
    }
}
