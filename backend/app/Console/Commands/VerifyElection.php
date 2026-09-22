<?php

namespace App\Console\Commands;

use App\Models\Election;
use App\Services\E2e\BoardVerifier;
use App\Services\E2e\BulletinBoardService;
use Illuminate\Console\Command;

/** Runs the board verifier against one election from the command line. */
class VerifyElection extends Command
{
    protected $signature = 'election:verify {election : Election id} {--json : Print the full report as JSON}';

    protected $description = 'Re-check every proof, the tally and the decryption of an end-to-end election';

    public function handle(BulletinBoardService $board, BoardVerifier $verifier): int
    {
        $election = Election::find($this->argument('election'));
        if (!$election || !$election->isE2e()) {
            $this->error('No end-to-end election with that id.');

            return self::FAILURE;
        }

        $report = $verifier->verify($board->export($election));

        if ($this->option('json')) {
            $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        } else {
            foreach ($report['checks'] as $c) {
                $this->line(sprintf('%-6s %s — %s', $c['skipped'] ? 'SKIP' : ($c['ok'] ? 'PASS' : 'FAIL'), $c['name'], $c['detail']));
                foreach ($c['failures'] as $f) {
                    $this->line("         · {$f}");
                }
            }
            $this->line($report['ok'] ? 'OVERALL: PASS' : 'OVERALL: FAIL');
        }

        return $report['ok'] ? self::SUCCESS : self::FAILURE;
    }
}
