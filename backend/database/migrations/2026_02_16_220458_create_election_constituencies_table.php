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
    Schema::create('election_constituencies', function (Blueprint $table) {
        $table->id();
        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
        $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();
        $table->timestamps();

        $table->unique(['election_id', 'constituency_id'], 'uq_election_constituency');
        $table->index(['constituency_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('election_constituencies');
    }
};
