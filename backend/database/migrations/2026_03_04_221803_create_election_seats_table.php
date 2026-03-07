<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up(): void
    {
        Schema::create('election_seats', function (Blueprint $table) {
            $table->id();

            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();

            // Which confession this seat quota belongs to
            $table->foreignId('confession_id')->constrained('confessions')->restrictOnDelete();

            $table->unsignedSmallInteger('seat_count');

            $table->timestamps();

            // One row per (election, constituency, confession)
            $table->unique(['election_id', 'constituency_id', 'confession_id'], 'uq_election_seats');
            $table->index(['election_id', 'constituency_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('election_seats');
    }
};
