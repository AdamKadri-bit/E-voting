<?php

namespace App\Console\Commands;

use App\Models\Election;
use App\Services\ElectoralRollService;
use Illuminate\Console\Command;

/** Builds an election's electoral roll from the civil registry. */
class SyncElectoralRoll extends Command
{
    protected $signature = 'roll:sync {election : Election id}';

    protected $description = 'Put every eligible registry person of the election\'s constituencies on its roll';

    public function handle(ElectoralRollService $rolls): int
    {
        $election = Election::find($this->argument('election'));
        if (!$election) {
            $this->error('No such election.');

            return self::FAILURE;
        }
        $added = $rolls->syncFromRegistry($election);
        $this->info("Added {$added} registry voter(s) to the roll of \"{$election->title}\".");

        return self::SUCCESS;
    }
}
