<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-election settings for end-to-end verifiable voting and diaspora voting.
 *
 * crypto_scheme separates the two ballot designs: 'e2e' (new — threshold
 * homomorphic encryption, the default for every new election) and 'legacy'
 * (server-key encryption). Elections that already hold legacy ballots stay
 * 'legacy' so their historical results remain readable; nothing is re-encrypted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('elections', function (Blueprint $table) {
            $table->string('crypto_scheme', 16)->default('e2e')->after('status');
            $table->boolean('diaspora_voting_enabled')->default(true)->after('crypto_scheme');
            $table->unsignedTinyInteger('trustee_threshold')->default(2)->after('diaspora_voting_enabled');
            $table->unsignedTinyInteger('trustee_count')->default(3)->after('trustee_threshold');
            // pending → in_progress → complete (or failed, after a trustee complaint)
            $table->string('key_ceremony_status', 16)->default('pending')->after('trustee_count');
            $table->char('joint_public_key', 64)->nullable()->after('key_ceremony_status');
            // none → decrypting → published
            $table->string('tally_status', 16)->default('none')->after('joint_public_key');
            $table->timestamp('results_published_at')->nullable()->after('tally_status');
        });

        $withLegacyBallots = DB::table('encrypted_ballots')->distinct()->pluck('election_id');

        if ($withLegacyBallots->isNotEmpty()) {
            DB::table('elections')->whereIn('id', $withLegacyBallots)->update(['crypto_scheme' => 'legacy']);
        }
    }

    public function down(): void
    {
        Schema::table('elections', function (Blueprint $table) {
            $table->dropColumn([
                'crypto_scheme', 'diaspora_voting_enabled', 'trustee_threshold', 'trustee_count',
                'key_ceremony_status', 'joint_public_key', 'tally_status', 'results_published_at',
            ]);
        });
    }
};
