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
    Schema::create('voter_election_status', function (Blueprint $table) {
        $table->id();

        $table->foreignId('voter_id')->constrained('voters')->cascadeOnDelete();
        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();

        $table->boolean('has_voted')->default(false);
        $table->dateTime('voted_at')->nullable();

        $table->timestamps();

        $table->unique(['voter_id', 'election_id'], 'uq_voter_election_once');
        $table->index(['election_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voter_election_status');
    }
};
