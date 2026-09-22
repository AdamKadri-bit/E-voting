<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The public bulletin board.
 *
 * e2e_ballots deliberately has NO user/voter column and NO timestamps: a ballot
 * is linked only to a per-election pseudonymous credential (so a re-vote can
 * supersede it), and its position in the board is its only ordering.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ballot_manifests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->json('options');
            $table->json('constraints');
            $table->char('hash', 64);
            $table->timestamps();

            $table->unique(['election_id', 'constituency_id', 'district_id'], 'uq_manifest_style');
        });

        Schema::create('e2e_ballots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('manifest_id')->constrained('ballot_manifests')->cascadeOnDelete();
            $table->unsignedBigInteger('constituency_id');
            $table->char('credential', 64);
            $table->char('tracking_code', 64)->unique();
            $table->string('short_code', 19);
            $table->longText('ciphertexts');
            $table->longText('proofs');
            $table->string('status', 16)->default('counted');

            $table->index(['election_id', 'credential']);
            $table->index(['election_id', 'status']);
            $table->index(['election_id', 'short_code']);
        });

        Schema::create('audited_ballots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('manifest_id')->constrained('ballot_manifests')->cascadeOnDelete();
            $table->char('tracking_code', 64)->unique();
            $table->string('short_code', 19);
            $table->longText('ciphertexts');
            $table->json('selections');
            $table->longText('randomness');

            $table->index(['election_id', 'short_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audited_ballots');
        Schema::dropIfExists('e2e_ballots');
        Schema::dropIfExists('ballot_manifests');
    }
};
