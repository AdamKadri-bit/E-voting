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
    Schema::create('candidacies', function (Blueprint $table) {
        $table->id();

        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
        $table->foreignId('candidate_profile_id')->constrained('candidate_profiles')->cascadeOnDelete();
        $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();

        $table->enum('status', ['pending', 'accepted', 'rejected', 'withdrawn'])->default('pending');
        $table->text('rejection_reason')->nullable();

        $table->timestamps();

        // Prevent duplicate registration of same candidate in same election/constituency
        $table->unique(['election_id', 'candidate_profile_id', 'constituency_id'], 'uq_candidacy_unique');
        $table->index(['election_id']);
        $table->index(['constituency_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidacies');
    }
};
