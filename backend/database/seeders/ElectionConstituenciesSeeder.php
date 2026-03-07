<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ElectionConstituenciesSeeder extends Seeder
{
    private function electionId(): int
    {
        $id = DB::table('elections')
            ->where('type', 'parliamentary')
            ->whereDate('starts_at', '2022-05-15')
            ->value('id');

        if (!$id) {
            throw new RuntimeException('Election 2022 not found.');
        }

        return (int) $id;
    }

    public function run(): void
    {
        $electionId = $this->electionId();

        $constituencies = DB::table('constituencies')->select('id')->get();

        foreach ($constituencies as $constituency) {
            DB::table('election_constituencies')->updateOrInsert(
                [
                    'election_id' => $electionId,
                    'constituency_id' => $constituency->id,
                ],
                [
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}