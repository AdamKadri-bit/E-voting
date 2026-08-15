<?php

namespace App\Console\Commands;

use App\Models\Election;
use Illuminate\Console\Command;

class CloseExpiredElections extends Command
{
    protected $signature = 'elections:auto-close';

    protected $description = 'Close active elections whose statutory voting window has ended';

    public function handle(): int
    {
        $closed = Election::autoCloseExpired();

        $this->info($closed === 0
            ? 'No elections past their voting window.'
            : "Closed {$closed} election(s) past their voting window.");

        return self::SUCCESS;
    }
}
