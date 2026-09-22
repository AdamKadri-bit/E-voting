<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who took part, and from where — never how they voted. Powers live turnout
 * and the world map. The timestamp is rounded to the hour so it cannot be
 * lined up against ballot order, and the raw IP is never stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_participations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('voter_id')->constrained('voters')->cascadeOnDelete();
            $table->string('voter_type', 16);
            $table->char('declared_country', 2);
            $table->char('ip_country', 2)->nullable();
            $table->boolean('location_mismatch')->default(false);
            $table->dateTime('coarse_timestamp');

            $table->unique(['election_id', 'voter_id']);
            $table->index(['election_id', 'declared_country']);
            $table->index(['election_id', 'ip_country']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_participations');
    }
};
