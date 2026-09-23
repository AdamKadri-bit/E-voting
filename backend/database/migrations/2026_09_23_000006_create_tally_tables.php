<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Homomorphic tally: one encrypted total per (constituency, option), the
 * trustees' proven partial decryptions, and the recovered counts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tally_aggregates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->unsignedBigInteger('constituency_id');
            $table->string('option_type', 16);
            $table->unsignedBigInteger('option_id');
            $table->string('key', 64);
            $table->char('a', 64);
            $table->char('b', 64);
            $table->unsignedInteger('ballot_count');
            $table->unsignedInteger('count')->nullable();
            $table->timestamps();

            $table->unique(['election_id', 'key']);
        });

        Schema::create('partial_decryptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->unsignedTinyInteger('trustee_index');
            $table->longText('shares');
            $table->timestamps();

            $table->unique(['election_id', 'trustee_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partial_decryptions');
        Schema::dropIfExists('tally_aggregates');
    }
};
