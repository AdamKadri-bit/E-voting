<?php

namespace Tests\Feature\E2e;

use App\Crypto\Group;
use App\Crypto\Threshold;
use App\Models\Election;
use App\Models\User;

/**
 * The three ceremony rounds through the HTTP API. PHP plays each trustee's
 * browser; sealed shares are opaque to the server, so random bytes stand in
 * for them — what matters here is what the server accepts and derives.
 */
class KeyCeremonyApiTest extends E2eTestCase
{
    private Election $draft;
    private array $users;

    protected function setUp(): void
    {
        parent::setUp();
        $this->draft = $this->b->election(['title' => 'Ceremony draft', 'starts_at' => now()->addDay(), 'ends_at' => now()->addDays(2)], $this->layout());
        $this->users = [
            User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]),
            User::factory()->create(['role' => 'voter', 'email_verified_at' => now(), 'name' => 'Dr. Ahmad Kassem']),
            User::factory()->create(['role' => 'admin', 'email_verified_at' => now()]),
        ];
        $this->loginAsAdmin();
        $this->putJson("/api/admin/elections/{$this->draft->id}/trustees", ['user_ids' => array_map(fn ($u) => $u->id, $this->users), 'threshold' => 2])
            ->assertOk()->assertJsonPath('phase', 'round1');
    }

    private function as(int $i): void
    {
        $this->authenticateAs($this->users[$i - 1]);
    }

    public function test_full_ceremony_derives_the_joint_key_and_unlocks_activation(): void
    {
        $r1 = [];
        foreach ([1, 2, 3] as $i) {
            $r1[$i] = Threshold::round1($this->draft->id, $i, 2);
            $this->as($i);
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round1", $r1[$i]['pub'])->assertOk();
        }

        foreach ([1, 2, 3] as $i) {
            $this->as($i);
            $shares = collect([1, 2, 3])->reject(fn ($j) => $j === $i)->map(fn ($j) => [
                'to' => $j, 'ephemeral' => bin2hex(Group::mulBase(Group::randomScalar())), 'nonce' => bin2hex(random_bytes(12)), 'ciphertext' => bin2hex(random_bytes(48)),
            ])->values()->all();
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round2", ['shares' => $shares])->assertOk();
        }

        $this->as(2);
        $this->assertCount(2, $this->getJson("/api/trustee/elections/{$this->draft->id}/incoming")->json('shares'));

        foreach ([1, 2, 3] as $j) {
            $s = Group::intScalar(0);
            foreach ($r1 as $r) {
                $s = Group::sAdd($s, Threshold::evalPoly($r['coefficients'], $j));
            }
            $this->as($j);
            // Refuses to finish without confirming the key-file backup.
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round3", ['share_public_key' => bin2hex(Group::mulBase($s)), 'complaints' => []])
                ->assertStatus(422);
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round3", ['share_public_key' => bin2hex(Group::mulBase($s)), 'complaints' => [], 'backup_confirmed' => true])
                ->assertOk();
        }

        $this->draft->refresh();
        $this->assertSame('complete', $this->draft->key_ceremony_status);
        $this->assertSame(bin2hex(Threshold::jointPublicKey(array_map(fn ($r) => $r['pub'], $r1))), $this->draft->joint_public_key);
        $this->assertDatabaseMissing('election_trustees', ['election_id' => $this->draft->id, 'share_public_key' => null]);
    }

    public function test_round1_with_a_bad_proof_is_rejected(): void
    {
        $r = Threshold::round1($this->draft->id, 1, 2);
        $r['pub']['commitment_proofs'][0]['z'] = bin2hex(Group::randomScalar());
        $this->as(1);
        $this->postJson("/api/trustee/elections/{$this->draft->id}/round1", $r['pub'])->assertStatus(422)->assertJsonPath('reason', 'invalid_proof');
    }

    public function test_rounds_must_run_in_order_and_only_trustees_take_part(): void
    {
        $this->as(1);
        $share = ['to' => 2, 'ephemeral' => bin2hex(Group::mulBase(Group::randomScalar())), 'nonce' => '00', 'ciphertext' => '00'];
        $this->postJson("/api/trustee/elections/{$this->draft->id}/round2", ['shares' => [$share]])->assertStatus(409)->assertJsonPath('reason', 'wrong_phase');
        $this->authenticateAs(User::factory()->create(['email_verified_at' => now()]));
        $this->getJson("/api/trustee/elections/{$this->draft->id}")->assertStatus(403);
    }

    public function test_a_complaint_fails_the_ceremony_and_admin_can_reset(): void
    {
        foreach ([1, 2, 3] as $i) {
            $this->as($i);
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round1", Threshold::round1($this->draft->id, $i, 2)['pub'])->assertOk();
        }
        foreach ([1, 2, 3] as $i) {
            $this->as($i);
            $shares = collect([1, 2, 3])->reject(fn ($j) => $j === $i)->map(fn ($j) => ['to' => $j, 'ephemeral' => bin2hex(Group::mulBase(Group::randomScalar())), 'nonce' => '00', 'ciphertext' => '00'])->values()->all();
            $this->postJson("/api/trustee/elections/{$this->draft->id}/round2", ['shares' => $shares])->assertOk();
        }
        $this->as(2);
        $this->postJson("/api/trustee/elections/{$this->draft->id}/round3", ['share_public_key' => null, 'complaints' => [1], 'backup_confirmed' => true])->assertOk();
        $this->assertSame('failed', $this->draft->fresh()->key_ceremony_status);

        $this->loginAsAdmin();
        $this->postJson("/api/admin/elections/{$this->draft->id}/ceremony/reset")->assertOk()->assertJsonPath('phase', 'round1');
    }

    public function test_threshold_must_fit_the_trustee_count(): void
    {
        $this->loginAsAdmin();
        $this->putJson("/api/admin/elections/{$this->draft->id}/trustees", ['user_ids' => [$this->users[0]->id], 'threshold' => 2])->assertStatus(422);
    }
}
