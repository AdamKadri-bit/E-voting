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
    Schema::create('districts', function (Blueprint $table) {
        $table->id();
        $table->foreignId('governorate_id')->constrained('governorates')->cascadeOnDelete();
        $table->string('code', 20)->unique();
        $table->string('name_en', 100);
        $table->string('name_ar', 100)->nullable();
        $table->timestamps();

        $table->index(['governorate_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('districts');
    }
};
