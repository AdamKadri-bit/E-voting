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
    Schema::create('candidate_profiles', function (Blueprint $table) {
        $table->id();

        $table->string('national_id_number', 30)->unique();
        $table->string('full_name', 200);
        $table->date('date_of_birth');

        $table->enum('civil_rights_status', ['full', 'restricted'])->default('full');

        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('candidate_profiles');
    }
};
