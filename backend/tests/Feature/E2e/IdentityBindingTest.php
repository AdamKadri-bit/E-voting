<?php

namespace Tests\Feature\E2e;

use App\Models\AuditLog;
use App\Models\RegistryPerson;

/**
 * The verified identity (registry record) and the voter profile the ballot is
 * built from must be the same person. Regression for: an account seeded as a
 * Keserwan voter was linked to someone else's Zahle passport and received the
 * Keserwan–Jbeil ballot.
 */
class IdentityBindingTest extends E2eTestCase
{
    private function someoneElsesRecord(): RegistryPerson
    {
        return RegistryPerson::create([
            'full_name_en' => 'Other Person', 'father_name_en' => 'Father', 'mother_name_en' => 'Mother',
            'date_of_birth' => '2004-07-10', 'civil_registry_number' => 'OTHER-81', 'constituency_id' => $this->c2, 'is_eligible' => true,
        ]);
    }

    public function test_linking_another_persons_document_to_an_account_with_a_voter_profile_is_refused(): void
    {
        $u = $this->voter('seeded@x.test', $this->d1, 'resident', null, [$this->election]);
        $u->forceFill(['registry_person_id' => null])->save();
        $this->someoneElsesRecord();
        $this->authenticateAs($u);

        $this->postJson('/api/registry/link', ['full_name' => 'Other Person', 'father_name' => 'Father', 'mother_name' => 'Mother', 'date_of_birth' => '2004-07-10', 'civil_registry_number' => 'OTHER-81'])
            ->assertStatus(409)->assertJsonPath('reason', 'identity_mismatch');
        $this->assertNull($u->fresh()->registry_person_id);
        $this->assertSame(1, AuditLog::where('action', 'registry.link_refused_mismatch')->count());
    }

    public function test_linking_your_own_record_works_and_is_audited(): void
    {
        $u = $this->voter('own@x.test', $this->d1, 'resident', null, [$this->election]);
        $u->forceFill(['registry_person_id' => null])->save();
        $this->authenticateAs($u);

        $this->postJson('/api/registry/link', ['full_name' => 'Test Own', 'father_name' => 'Demo', 'mother_name' => 'Demo Mother', 'date_of_birth' => '1990-01-01'])
            ->assertOk();
        $this->assertNotNull($u->fresh()->registry_person_id);
        $this->assertSame(1, AuditLog::where('action', 'registry.linked')->count());
    }

    public function test_account_without_a_voter_profile_can_link_any_matching_record(): void
    {
        $u = \App\Models\User::factory()->create(['role' => 'voter', 'email_verified_at' => now()]);
        $this->someoneElsesRecord();
        $this->authenticateAs($u);

        $this->postJson('/api/registry/link', ['full_name' => 'Other Person', 'father_name' => 'Father', 'mother_name' => 'Mother', 'date_of_birth' => '2004-07-10'])
            ->assertOk();
    }

    public function test_unverified_account_gets_no_ballot_even_with_a_voter_profile(): void
    {
        $u = $this->voter('unverified@x.test', $this->d1, 'resident', null, [$this->election]);
        $u->forceFill(['registry_person_id' => null])->save();
        $this->authenticateAs($u);

        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertStatus(403)->assertJsonPath('reason', 'not_verified');
    }

    public function test_existing_mismatched_link_blocks_the_ballot(): void
    {
        // The state the bug left behind: a Chouf voter profile linked to a record from another constituency.
        $u = $this->voter('mixed@x.test', $this->d1, 'resident', null, [$this->election]);
        $u->forceFill(['registry_person_id' => $this->someoneElsesRecord()->id])->save();
        $this->authenticateAs($u);

        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertStatus(409)->assertJsonPath('reason', 'identity_mismatch');
        $this->assertSame(0, $this->election->e2eBallots()->count());
    }
}
