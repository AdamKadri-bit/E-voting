<?php

namespace Tests\Feature\E2e;

use App\Models\ElectoralRollEntry;
use App\Models\RegistryPerson;
use App\Models\User;
use App\Services\ElectoralRollService;

/**
 * A brand-new account verifies against the registry and can vote: the roll
 * is drawn from the registry and the voter profile is created from the
 * verified record.
 */
class RegistryRollTest extends E2eTestCase
{
    private function chouffResident(array $overrides = []): RegistryPerson
    {
        return RegistryPerson::create(array_merge([
            'full_name_en' => 'Elias Khoury', 'full_name_ar' => 'إلياس خوري',
            'father_name_en' => 'Antoine', 'mother_name_en' => 'Rima Saab',
            'date_of_birth' => '1992-03-14', 'civil_registry_number' => 'CHOUF-T-01',
            'district' => 'Chouf', 'constituency_id' => $this->c1, 'is_eligible' => true,
        ], $overrides));
    }

    public function test_new_account_verifies_by_typing_details_and_can_vote(): void
    {
        $person = $this->chouffResident();
        app(ElectoralRollService::class)->syncFromRegistry($this->election);
        $this->assertDatabaseHas('electoral_roll_entries', ['election_id' => $this->election->id, 'national_id_number' => $person->rollKey()]);

        $u = User::factory()->create(['role' => 'voter', 'email_verified_at' => now(), 'voter_type' => 'resident']);
        $this->authenticateAs($u);
        $this->postJson('/api/registry/link', ['full_name' => 'Elias Khoury', 'father_name' => 'Antoine', 'mother_name' => 'Rima Saab', 'date_of_birth' => '1992-03-14'])
            ->assertOk();

        $voter = $u->fresh()->voter;
        $this->assertNotNull($voter);
        $this->assertSame($person->rollKey(), $voter->national_id_number);
        $this->assertSame($this->d1->id, $voter->registered_district_id);

        $this->castViaApi($u->fresh(), $this->listId('Mountain Unity'), $this->candidacyId('Rami Haddad'))->assertCreated();
    }

    public function test_linking_enrolls_the_new_voter_on_open_elections_of_their_constituency(): void
    {
        $this->chouffResident();
        $u = User::factory()->create(['role' => 'voter', 'email_verified_at' => now(), 'voter_type' => 'resident']);
        $this->authenticateAs($u);
        $this->postJson('/api/registry/link', ['full_name' => 'Elias Khoury', 'father_name' => 'Antoine', 'mother_name' => 'Rima Saab', 'date_of_birth' => '1992-03-14'])->assertOk();

        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertOk()->assertJsonPath('district.name', 'Chouf');
    }

    public function test_roll_sync_is_idempotent_and_never_lists_a_linked_voter_twice(): void
    {
        $linked = $this->voter('seeded@x.test', $this->d1, 'resident', null, [$this->election]);
        $svc = app(ElectoralRollService::class);
        $svc->syncFromRegistry($this->election);
        $before = ElectoralRollEntry::where('election_id', $this->election->id)->count();
        $this->assertSame(0, $svc->syncFromRegistry($this->election));
        $this->assertSame($before, ElectoralRollEntry::where('election_id', $this->election->id)->count());
        $this->assertSame(1, ElectoralRollEntry::where('election_id', $this->election->id)->where('first_name', 'Test')->where('last_name', 'Seeded')->count());
        $this->assertNotNull($linked->registry_person_id);
    }

    public function test_ineligible_or_unplaceable_records_are_not_put_on_the_roll(): void
    {
        $this->chouffResident(['civil_registry_number' => 'X1', 'is_eligible' => false]);
        $this->chouffResident(['civil_registry_number' => 'X2', 'full_name_en' => 'No Place', 'district' => null, 'constituency_id' => null]);
        $this->assertSame(0, app(ElectoralRollService::class)->syncFromRegistry($this->election));
    }
}
