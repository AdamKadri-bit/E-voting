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
    Schema::create('lists', function (Blueprint $table) {
        $table->id();

        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
        $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();

        $table->string('list_name', 200);

        $table->timestamps();

        $table->unique(['election_id', 'constituency_id', 'list_name'], 'uq_list_name_scope');
        $table->index(['election_id']);
        $table->index(['constituency_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lists');
    }
};
