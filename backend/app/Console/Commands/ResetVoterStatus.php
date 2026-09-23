<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/** Test/demo helper: clears a voter's resident/diaspora choice so the sign-in prompt shows again. */
class ResetVoterStatus extends Command
{
    protected $signature = 'demo:reset-voter-status {email} {--unlink : Also unlink the voter-registry record (to redo the ID scan)}';

    protected $description = 'Clear a demo voter\'s resident/diaspora status (non-production only)';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing in production.');

            return self::FAILURE;
        }
        $changes = ['voter_type' => null, 'residence_country' => null, 'voter_type_set_at' => null];
        if ($this->option('unlink')) {
            $changes += ['registry_person_id' => null, 'verification_status' => 'account_created', 'can_vote' => false];
        }
        $n = User::where('email', $this->argument('email'))->update($changes);
        $this->info($n ? 'Status cleared.' : 'No such user.');

        return self::SUCCESS;
    }
}
