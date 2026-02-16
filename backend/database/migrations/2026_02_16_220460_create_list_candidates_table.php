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
    Schema::create('list_candidates', function (Blueprint $table) {
        $table->id();

        $table->foreignId('list_id')->constrained('lists')->cascadeOnDelete();
        $table->foreignId('candidacy_id')->constrained('candidacies')->cascadeOnDelete();

        $table->unsignedInteger('position_order')->nullable();

        $table->timestamps();

        $table->unique(['list_id', 'candidacy_id'], 'uq_list_candidate_member');
        $table->index(['candidacy_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('list_candidates');
    }
};
