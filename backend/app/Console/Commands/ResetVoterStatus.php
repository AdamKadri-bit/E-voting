<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/** Test/demo helper: clears a voter's resident/diaspora choice so the sign-in prompt shows again. */
class ResetVoterStatus extends Command
{
    protected $signature = 'demo:reset-voter-status {email}';

    protected $description = 'Clear a demo voter\'s resident/diaspora status (non-production only)';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing in production.');

            return self::FAILURE;
        }
        $n = User::where('email', $this->argument('email'))->update(['voter_type' => null, 'residence_country' => null, 'voter_type_set_at' => null]);
        $this->info($n ? 'Status cleared.' : 'No such user.');

        return self::SUCCESS;
    }
}
