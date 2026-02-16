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
    Schema::create('constituencies', function (Blueprint $table) {
        $table->id();
        $table->string('code', 30)->unique();
        $table->string('name_en', 150);
        $table->string('name_ar', 150)->nullable();
        $table->string('law_ref', 50)->default('Law 44/2017');
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('constituencies');
    }
};
