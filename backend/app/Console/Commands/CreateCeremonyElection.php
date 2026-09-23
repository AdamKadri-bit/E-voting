<?php

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Election;
use App\Models\User;
use App\Services\E2e\KeyCeremonyService;
use Database\Seeders\Support\DemoElectionBuilder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Creates a fresh draft election whose key ceremony has trustees assigned but
 * not run — so the real browser ceremony (and then voting, closing and the
 * decryption ceremony) can be exercised end to end. Refuses to run in production.
 */
class CreateCeremonyElection extends Command
{
    protected $signature = 'demo:ceremony-election {--title=Ceremony drill (Demo)} {--json}';

    protected $description = 'Create a demo draft election awaiting its trustee key ceremony';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to create demo data in production.');

            return self::FAILURE;
        }

        $chouf = District::where('name_en', 'Chouf')->firstOrFail();
        $aley = District::where('name_en', 'Aley')->firstOrFail();
        $cid = (int) DB::table('constituency_districts')->where('district_id', $chouf->id)->value('constituency_id');

        $b = new DemoElectionBuilder();
        $election = $b->election(['title' => $this->option('title') . ' #' . now()->format('His') . random_int(10, 99), 'starts_at' => now()->subMinutes(5), 'ends_at' => now()->addDay()], [
            ['constituency_id' => $cid, 'lists' => [
                ['name' => 'Drill Unity', 'candidates' => [['name' => 'Drill Candidate A', 'district_id' => $chouf->id], ['name' => 'Drill Candidate B', 'district_id' => $aley->id]]],
                ['name' => 'Drill Change', 'candidates' => [['name' => 'Drill Candidate C', 'district_id' => $chouf->id]]],
            ]],
        ]);

        $trustees = User::whereIn('email', ['admin@evoting.local', 'kassem@evoting.local', 'officer@evoting.local'])
            ->orderByRaw("CASE email WHEN 'admin@evoting.local' THEN 1 WHEN 'kassem@evoting.local' THEN 2 ELSE 3 END")
            ->pluck('id')->all();
        app(KeyCeremonyService::class)->assign($election, $trustees, 2, null);

        // Demo voters on this election's roll.
        foreach (['resident@evoting.local' => $chouf, 'diaspora@evoting.local' => $aley] as $email => $d) {
            $u = User::where('email', $email)->first();
            if ($u) {
                $b->voter($email, $u->name, $d, $u->voter_type, $u->residence_country, [$election]);
            }
        }

        $this->option('json') ? $this->line(json_encode(['id' => $election->id, 'title' => $election->title])) : $this->info("Created election #{$election->id}: {$election->title}");

        return self::SUCCESS;
    }
}
