<?php

namespace Tests\Feature\E2e;

use App\Crypto\Group;
use App\Crypto\Threshold;
use App\Models\ElectionTrustee;
use App\Models\TallyAggregate;
use App\Services\E2e\TallyService;

class TallyAndDecryptionTest extends E2eTestCase
{
    /** Casts a known set of votes (with a re-vote) and returns the plaintext tally the harness expects. */
    private function castKnownVotes(): array
    {
        $plan = [
            ['a@x.test', $this->d1, 'Mountain Unity', 'Rami Haddad'],
            ['b@x.test', $this->d1, 'Mountain Unity', null],
            ['c@x.test', $this->d2, 'Civic Change', 'Maya Saad'],
            ['d@x.test', $this->d2, 'Mountain Unity', 'Lina Aoun'],
            ['e@x.test', $this->d3, 'Metn Forward', 'Nour Salem'],
            ['f@x.test', $this->d3, 'Metn First', null],
        ];
        $expected = [];
        foreach ($plan as [$email, $d, $list, $cand]) {
            $u = $this->voter($email, $d, $email === 'c@x.test' ? 'diaspora' : 'resident', $email === 'c@x.test' ? 'AU' : null);
            $this->castViaApi($u, $this->listId($list), $cand ? $this->candidacyId($cand) : null)->assertCreated();
            if ($email === 'b@x.test') {
                // Re-vote: b's first ballot is superseded, only this one counts.
                $this->castViaApi($u, $this->listId('Civic Change'), $this->candidacyId('Karim Nasr'))->assertCreated();
                $list = 'Civic Change';
                $cand = 'Karim Nasr';
            }
            $expected["list:{$list}"] = ($expected["list:{$list}"] ?? 0) + 1;
            if ($cand) {
                $expected["cand:{$cand}"] = ($expected["cand:{$cand}"] ?? 0) + 1;
            }
        }

        return $expected;
    }

    private function closeAndAggregate(): void
    {
        $this->loginAsAdmin();
        $this->patchJson("/api/admin/elections/{$this->election->id}/status", ['status' => 'closed'])->assertOk();
        $this->election->refresh();
        $this->assertSame('decrypting', $this->election->tally_status);
    }

    private function submitAs(int $j): \Illuminate\Testing\TestResponse
    {
        $this->authenticateAs($this->trustees[$j - 1]);
        $aggs = $this->getJson("/api/trustee/elections/{$this->election->id}/decryption")->assertOk()->json('aggregates');

        return $this->postJson("/api/trustee/elections/{$this->election->id}/partial", [
            'shares' => Threshold::partialDecrypt($this->election->id, $j, $this->shares[$j], $aggs),
        ]);
    }

    public function test_results_are_hidden_until_decryption(): void
    {
        $this->castKnownVotes();
        $this->loginAsAdmin();
        $r = $this->getJson("/api/admin/elections/{$this->election->id}/results")->assertOk();
        $this->assertFalse($r->json('results_available'));
        $this->assertSame([], $r->json('lists'));
        $this->assertFalse($this->getJson("/api/admin/elections/{$this->election->id}/geo-results")->json('results_available'));
    }

    public function test_homomorphic_tally_with_exactly_k_trustees_matches_the_plaintext_tally(): void
    {
        $expected = $this->castKnownVotes();
        $this->closeAndAggregate();

        $this->submitAs(1)->assertOk()->assertJsonPath('tally_status', 'decrypting');
        $this->submitAs(3)->assertOk()->assertJsonPath('tally_status', 'published');

        $got = [];
        foreach (TallyAggregate::where('election_id', $this->election->id)->get() as $a) {
            if ($a->count === 0) {
                continue;
            }
            $name = $a->option_type === 'list'
                ? 'list:' . \DB::table('lists')->where('id', $a->option_id)->value('list_name_en')
                : 'cand:' . \DB::table('candidacies')->join('candidate_profiles', 'candidate_profiles.id', '=', 'candidacies.candidate_profile_id')->where('candidacies.id', $a->option_id)->value('full_name');
            $got[$name] = ($got[$name] ?? 0) + $a->count;
        }
        ksort($expected);
        ksort($got);
        $this->assertSame($expected, $got);

        $this->loginAsAdmin();
        $r = $this->getJson("/api/admin/elections/{$this->election->id}/results")->assertOk();
        $this->assertTrue($r->json('results_available'));
        $this->assertSame(2, collect($r->json('lists'))->firstWhere('list_name', 'Civic Change')['votes']);
    }

    public function test_k_minus_one_trustees_cannot_decrypt(): void
    {
        $this->castKnownVotes();
        $this->closeAndAggregate();
        $this->submitAs(2)->assertOk();

        $this->assertSame('decrypting', $this->election->fresh()->tally_status);
        $this->assertNull(TallyAggregate::where('election_id', $this->election->id)->whereNotNull('count')->first());

        // Mathematically too: combining a single share gives no valid count.
        $agg = TallyAggregate::where('election_id', $this->election->id)->where('option_type', 'list')->first();
        $one = Threshold::partialDecrypt($this->election->id, 2, $this->shares[2], [['key' => $agg->key, 'a' => $agg->a, 'b' => $agg->b]]);
        $mG = Threshold::combine($agg->b, [2 => Group::pointFromHex($one[0]['m'])]);
        $this->expectException(\RuntimeException::class);
        Threshold::discreteLog($mG, $agg->ballot_count);
    }

    public function test_forcing_finalize_below_threshold_is_refused(): void
    {
        $this->castKnownVotes();
        $this->closeAndAggregate();
        $this->submitAs(1)->assertOk();
        $this->expectExceptionMessage('Need 2 partial decryptions');
        app(TallyService::class)->finalize($this->election->fresh());
    }

    public function test_partial_decryption_with_a_bad_proof_is_rejected(): void
    {
        $this->castKnownVotes();
        $this->closeAndAggregate();
        $this->authenticateAs($this->trustees[0]);
        $aggs = $this->getJson("/api/trustee/elections/{$this->election->id}/decryption")->json('aggregates');
        // Trustee 1 tries to submit using the wrong share.
        $bad = Threshold::partialDecrypt($this->election->id, 1, $this->shares[2], $aggs);
        $this->postJson("/api/trustee/elections/{$this->election->id}/partial", ['shares' => $bad])
            ->assertStatus(422)->assertJsonPath('reason', 'invalid_proof');
    }

    public function test_non_trustee_cannot_submit(): void
    {
        $this->castKnownVotes();
        $this->closeAndAggregate();
        $this->authenticateAs($this->voter('x@x.test', $this->d1));
        $this->getJson("/api/trustee/elections/{$this->election->id}/decryption")->assertStatus(403);
    }

    public function test_closed_e2e_election_cannot_be_reopened_and_voted_one_cannot_return_to_draft(): void
    {
        $this->castKnownVotes();
        $this->loginAsAdmin();
        $this->patchJson("/api/admin/elections/{$this->election->id}/status", ['status' => 'draft'])->assertStatus(422);
        $this->closeAndAggregate();
        $this->patchJson("/api/admin/elections/{$this->election->id}/status", ['status' => 'active'])->assertStatus(422);
        $this->patchJson("/api/admin/elections/{$this->election->id}/status", ['status' => 'draft'])->assertStatus(422);
        $this->assertSame('closed', $this->election->fresh()->status);
    }
}
