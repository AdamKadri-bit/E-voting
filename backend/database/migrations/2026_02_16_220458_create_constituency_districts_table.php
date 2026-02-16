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
    Schema::create('constituency_districts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();
        $table->foreignId('district_id')->constrained('districts')->cascadeOnDelete();
        $table->timestamps();

        $table->unique(['constituency_id', 'district_id'], 'uq_constituency_district');
        $table->index(['district_id']);
        $table->index(['constituency_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('constituency_districts');
    }
};
