<?php

namespace Tests\Feature\E2e;

use App\Crypto\ElGamal;
use App\Crypto\Group;
use App\Models\E2eBallot;
use App\Models\PartialDecryption;
use App\Models\TallyAggregate;

class VerifierAndBoardTest extends E2eTestCase
{
    private function runElection(): void
    {
        foreach ([['a', $this->d1, 'Mountain Unity'], ['b', $this->d2, 'Civic Change'], ['c', $this->d3, 'Metn First']] as [$n, $d, $l]) {
            $u = $this->voter("{$n}@x.test", $d);
            $this->castViaApi($u, $this->listId($l), null)->assertCreated();
        }
        $again = \App\Models\User::where('email', 'a@x.test')->first();
        $this->castViaApi($again, $this->listId('Civic Change'), null)->assertCreated();
        $this->b->audit($this->election, $again, $this->listId('Mountain Unity'), null);
        $this->b->closeAndDecrypt($this->election, $this->shares, [2, 3]);
    }

    private function verify(): array
    {
        $this->loginAsAdmin();

        return $this->getJson("/api/admin/elections/{$this->election->id}/verify")->assertOk()->json();
    }

    private function check(array $report, string $id): bool
    {
        return collect($report['checks'])->firstWhere('id', $id)['ok'];
    }

    public function test_honest_election_verifies(): void
    {
        $this->runElection();
        $report = $this->verify();
        $this->assertTrue($report['ok'], json_encode(collect($report['checks'])->where('ok', false)->values()));
        $this->artisan('election:verify', ['election' => $this->election->id])->assertExitCode(0);
    }

    public function test_board_export_has_everything_the_verifier_needs(): void
    {
        $this->runElection();
        $x = $this->getJson("/api/board/elections/{$this->election->id}/export")->assertOk();
        $x->assertJsonPath('election.joint_public_key', $this->election->fresh()->joint_public_key);
        $this->assertCount(3, $x->json('trustees'));
        $this->assertCount(4, $x->json('ballots'));
        $this->assertCount(1, $x->json('audited_ballots'));
        $this->assertSame([2, 3], $x->json('tally.used_trustees'));
        $this->assertSame(['counted', 'counted', 'counted', 'superseded'], collect($x->json('ballots'))->pluck('status')->sort()->values()->all());
    }

    public function test_tampered_ballot_fails_verification(): void
    {
        $this->runElection();
        $row = E2eBallot::where('status', 'counted')->first();
        $cts = $row->ciphertexts;
        $cts[0] = ElGamal::toJson(ElGamal::encrypt(1, Group::randomScalar(), Group::pointFromHex($this->election->fresh()->joint_public_key)));
        $row->update(['ciphertexts' => $cts]);

        $report = $this->verify();
        $this->assertFalse($report['ok']);
        $this->assertFalse($this->check($report, 'ballots'));
    }

    public function test_tampered_tally_fails_verification(): void
    {
        $this->runElection();
        $agg = TallyAggregate::where('election_id', $this->election->id)->where('count', '>', 0)->first();
        $agg->update(['count' => $agg->count + 5]);

        $report = $this->verify();
        $this->assertFalse($report['ok']);
        $this->assertFalse($this->check($report, 'decryption'));
    }

    public function test_tampered_partial_decryption_fails_verification(): void
    {
        $this->runElection();
        $p = PartialDecryption::where('election_id', $this->election->id)->where('trustee_index', 2)->first();
        $shares = $p->shares;
        $shares[0]['m'] = bin2hex(Group::mulBase(Group::randomScalar()));
        $p->update(['shares' => $shares]);

        $this->assertFalse($this->check($this->verify(), 'decryption'));
    }

    public function test_hiding_a_ballot_as_superseded_fails_verification(): void
    {
        $this->runElection();
        E2eBallot::where('status', 'counted')->first()->update(['status' => 'superseded']);
        $report = $this->verify();
        $this->assertFalse($this->check($report, 'revotes'));
        $this->assertFalse($report['ok']);
    }

    public function test_public_board_endpoints(): void
    {
        $this->runElection();
        $this->withCredentials = false;
        $this->getJson('/api/board/elections')->assertOk()->assertJsonFragment(['id' => $this->election->id]);
        $s = $this->getJson("/api/board/elections/{$this->election->id}")->assertOk();
        $this->assertSame(['cast' => 4, 'counted' => 3, 'superseded' => 1, 'audited' => 1], $s->json('counts'));
        $this->getJson("/api/board/elections/{$this->election->id}/ballots?kind=audited")->assertOk()->assertJsonPath('total', 1);
        $code = $s->json() ? E2eBallot::first()->short_code : '';
        $this->getJson("/api/board/elections/{$this->election->id}/lookup/" . strtolower(str_replace('-', ' ', $code)))->assertOk();
        $this->getJson("/api/board/elections/{$this->election->id}/lookup/ZZZZ-ZZZZ-ZZZZ-ZZZZ")->assertNotFound();
    }

    public function test_report_downloads_with_all_sections(): void
    {
        $this->runElection();
        $this->loginAsAdmin();
        $r = $this->get("/api/admin/elections/{$this->election->id}/report");
        $r->assertOk();
        $tmp = tempnam(sys_get_temp_dir(), 'rep') . '.xlsx';
        file_put_contents($tmp, $r->streamedContent());
        $book = \PhpOffice\PhpSpreadsheet\IOFactory::load($tmp);
        $this->assertSame(['Summary', 'Countries', 'Map', 'Bulletin board', 'Verification', 'Results'], $book->getSheetNames());
        $this->assertCount(1, $book->getSheetByName('Map')->getDrawingCollection());
        $summary = collect($book->getSheetByName('Summary')->toArray())->pluck(1, 0);
        $this->assertSame('PASS', $summary['Independent verification']);
        @unlink($tmp);
    }
}
