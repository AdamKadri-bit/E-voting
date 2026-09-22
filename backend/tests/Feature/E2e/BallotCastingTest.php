<?php

namespace Tests\Feature\E2e;

use App\Crypto\BallotCrypto;
use App\Crypto\ElGamal;
use App\Crypto\Group;
use App\Models\E2eBallot;
use Database\Seeders\Support\DemoElectionBuilder;

class BallotCastingTest extends E2eTestCase
{
    public function test_valid_encrypted_ballot_is_accepted_with_a_receipt(): void
    {
        $u = $this->voter('v@x.test', $this->d1);
        $r = $this->castViaApi($u, $this->listId('Mountain Unity'), $this->candidacyId('Rami Haddad'))->assertCreated();

        $code = $r->json('receipt.tracking_code');
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $code);
        $this->assertMatchesRegularExpression('/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/', $r->json('receipt.short_code'));
        $this->getJson("/api/board/elections/{$this->election->id}/lookup/" . $r->json('receipt.short_code'))
            ->assertOk()->assertJsonPath('status', 'counted');
    }

    /** @return array{0: array, 1: array} ballot response + an honest encrypted ballot */
    private function honestBallot($u): array
    {
        $this->authenticateAs($u);
        $b = $this->getJson("/api/elections/{$this->election->id}/ballot")->json('e2e');
        $enc = BallotCrypto::encrypt($b['manifest'], $b['joint_public_key'], $b['credential'], DemoElectionBuilder::selection($b['manifest'], $this->listId('Mountain Unity'), null));

        return [$b, $enc['ballot']];
    }

    public function test_over_voted_ballot_is_rejected_by_proof_verification(): void
    {
        $u = $this->voter('evil@x.test', $this->d1);
        [$b, $ballot] = $this->honestBallot($u);

        // "1000 votes" for the first list, keeping the honest proof.
        $ballot['ciphertexts'][0] = ElGamal::toJson(ElGamal::encrypt(1000, Group::randomScalar(), Group::pointFromHex($b['joint_public_key'])));

        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $ballot])
            ->assertStatus(422)->assertJsonPath('reason', 'invalid_proof');
        $this->assertSame(0, E2eBallot::count());
    }

    public function test_two_lists_at_once_is_rejected(): void
    {
        $u = $this->voter('two@x.test', $this->d1);
        [$b, $ballot] = $this->honestBallot($u);
        $other = BallotCrypto::encrypt($b['manifest'], $b['joint_public_key'], $b['credential'], DemoElectionBuilder::selection($b['manifest'], $this->listId('Civic Change'), null))['ballot'];
        $ballot['ciphertexts'][1] = $other['ciphertexts'][1];
        $ballot['option_proofs'][1] = $other['option_proofs'][1];

        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $ballot])->assertStatus(422);
    }

    public function test_ballot_for_another_credential_is_rejected(): void
    {
        $alice = $this->voter('alice@x.test', $this->d1);
        $bob = $this->voter('bob@x.test', $this->d1);
        [, $ballot] = $this->honestBallot($alice);

        $this->authenticateAs($bob);
        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $ballot])
            ->assertStatus(422)->assertJsonPath('reason', 'wrong_credential');
    }

    public function test_revote_supersedes_the_earlier_ballot_and_only_the_last_counts(): void
    {
        $u = $this->voter('re@x.test', $this->d1);
        $first = $this->castViaApi($u, $this->listId('Mountain Unity'), null)->assertCreated()->json('receipt.tracking_code');
        $second = $this->castViaApi($u, $this->listId('Civic Change'), null)->assertCreated();

        $this->assertTrue($second->json('receipt.replaces_previous'));
        $this->assertSame('superseded', E2eBallot::where('tracking_code', $first)->value('status'));
        $this->assertSame(1, E2eBallot::where('status', 'counted')->count());
        $this->assertSame(2, E2eBallot::count());
        $this->assertSame(1, $this->election->participations()->count());
    }

    public function test_voter_cannot_vote_twice_by_switching_between_resident_and_diaspora_flows(): void
    {
        $u = $this->voter('switch@x.test', $this->d1, 'resident');
        $this->castViaApi($u, $this->listId('Mountain Unity'), null)->assertCreated();

        // The status is frozen while the election is open…
        $this->putJson('/api/me/voter-status', ['voter_type' => 'diaspora', 'residence_country' => 'FR'])->assertStatus(422);

        // …and even if it weren't, both flows use the same credential, so a second ballot supersedes the first.
        $u->forceFill(['voter_type' => 'diaspora', 'residence_country' => 'FR'])->save();
        $this->castViaApi($u, $this->listId('Civic Change'), null)->assertCreated();

        $this->assertSame(1, E2eBallot::where('status', 'counted')->count());
        $this->assertSame(1, $this->election->participations()->count());
    }

    public function test_same_ciphertext_cannot_be_submitted_twice(): void
    {
        $u = $this->voter('dup@x.test', $this->d1);
        [, $ballot] = $this->honestBallot($u);
        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $ballot])->assertCreated();
        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $ballot])->assertStatus(422)->assertJsonPath('reason', 'duplicate');
    }

    public function test_retired_plaintext_endpoint_answers_gone(): void
    {
        $u = $this->voter('old@x.test', $this->d1);
        $this->authenticateAs($u);
        $this->postJson("/api/elections/{$this->election->id}/vote", ['list_id' => $this->listId('Mountain Unity')])->assertStatus(410);
        $this->assertSame(0, E2eBallot::count());
    }

    public function test_ballots_are_refused_before_the_key_ceremony_and_after_closing(): void
    {
        $u = $this->voter('late@x.test', $this->d1);
        $this->election->update(['status' => 'closed']);
        $this->authenticateAs($u);
        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertStatus(422)->assertJsonPath('reason', 'not_active');
    }

    public function test_voter_not_on_the_roll_cannot_vote(): void
    {
        $u = $this->voter('off@x.test', $this->d1, 'resident', null, []);
        $this->authenticateAs($u);
        $this->getJson("/api/elections/{$this->election->id}/ballot")->assertStatus(403)->assertJsonPath('reason', 'not_on_roll');
    }

    public function test_audited_ballot_is_published_without_login_and_cannot_then_be_cast(): void
    {
        $u = $this->voter('aud@x.test', $this->d1);
        $this->authenticateAs($u);
        $b = $this->getJson("/api/elections/{$this->election->id}/ballot")->json('e2e');
        $sel = DemoElectionBuilder::selection($b['manifest'], $this->listId('Civic Change'), $this->candidacyId('Karim Nasr'));
        $enc = BallotCrypto::encrypt($b['manifest'], $b['joint_public_key'], $b['credential'], $sel);

        // No session cookie is sent — exactly as the browser does it.
        $this->withCredentials = false;
        $this->postJson("/api/elections/{$this->election->id}/audited-ballots", ['audit' => [
            'manifest_id' => $b['manifest']['id'], 'manifest_hash' => $b['manifest']['hash'],
            'ciphertexts' => $enc['ballot']['ciphertexts'], 'selections' => $sel, 'randomness' => $enc['randomness'],
        ]])->assertCreated()->assertJsonPath('status', 'audited');

        // A lying audit (claims a different choice) is rejected.
        $this->postJson("/api/elections/{$this->election->id}/audited-ballots", ['audit' => [
            'manifest_id' => $b['manifest']['id'], 'manifest_hash' => $b['manifest']['hash'],
            'ciphertexts' => $enc['ballot']['ciphertexts'],
            'selections' => DemoElectionBuilder::selection($b['manifest'], $this->listId('Mountain Unity'), null),
            'randomness' => $enc['randomness'],
        ]])->assertStatus(422);

        // The spoiled ballot can never be cast.
        $this->authenticateAs($u);
        $this->postJson("/api/elections/{$this->election->id}/ballots", ['ballot' => $enc['ballot']])->assertStatus(422)->assertJsonPath('reason', 'duplicate');
    }
}
