<?php

namespace Tests\Feature\E2e;

class VoterStatusTest extends E2eTestCase
{
    public function test_voter_without_status_is_told_to_choose_one(): void
    {
        $u = $this->voter('new@x.test', $this->d1, null);
        $this->authenticateAs($u);

        $this->getJson('/api/me')->assertOk()->assertJsonPath('user.voter_status.required', true);
        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertStatus(428)->assertJsonPath('reason', 'status_required');
    }

    public function test_resident_and_diaspora_statuses_are_saved(): void
    {
        $u = $this->voter('a@x.test', $this->d1, null, null, []);
        $this->authenticateAs($u);

        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora', 'residence_country' => 'fr'])
            ->assertOk()->assertJsonPath('status.residence_country', 'FR')->assertJsonPath('status.residence_country_name', 'France');

        $this->putJson('/api/me/voter-status', ['voter_type' => 'resident', 'residence_country' => 'FR'])
            ->assertOk()->assertJsonPath('status.voter_type', 'resident')->assertJsonPath('status.residence_country', null);
    }

    public function test_backend_rejects_bad_status_input(): void
    {
        $u = $this->voter('b@x.test', $this->d1, null, null, []);
        $this->authenticateAs($u);

        $this->putJson('/api/me/voter-status', ['voter_type' => 'tourist'])->assertStatus(422)->assertJsonValidationErrors('voter_type');
        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora'])->assertStatus(422)->assertJsonValidationErrors('residence_country');
        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora', 'residence_country' => 'ZZ'])->assertStatus(422);
        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora', 'residence_country' => 'LB'])->assertStatus(422);
    }

    public function test_status_is_locked_while_an_eligible_election_is_open(): void
    {
        $u = $this->voter('c@x.test', $this->d1, 'diaspora', 'DE');
        $this->authenticateAs($u);

        $this->getJson('/api/me')->assertJsonPath('user.voter_status.locked', true);
        $this->putJson('/api/me/voter-status', ['voter_type' => 'resident'])->assertStatus(422)->assertJsonValidationErrors('voter_type');
        $this->assertSame('diaspora', $u->fresh()->voter_type);

        // Re-saving the same status is harmless.
        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora', 'residence_country' => 'DE'])->assertOk();
    }

    public function test_status_unlocks_once_the_election_closes(): void
    {
        $u = $this->voter('d@x.test', $this->d1, 'diaspora', 'DE');
        $this->election->update(['status' => 'closed']);
        $this->authenticateAs($u);

        $this->putJson('/api/me/voter-status', ['voter_type' => 'resident'])->assertOk();
    }
}
