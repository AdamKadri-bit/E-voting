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
    Schema::create('voters', function (Blueprint $table) {
        $table->id();

        // 1:1 link to a login account
        $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();

        // Lebanese registry-style identity fields
        $table->string('national_id_number', 30)->unique();
        $table->string('first_name', 80);
        $table->string('father_name', 80);
        $table->string('last_name', 80);
        $table->string('mother_full_name', 160)->nullable();

        $table->date('date_of_birth');
        $table->string('place_of_birth', 120)->nullable();

        // Registered voting location (determines constituency)
        $table->foreignId('registered_governorate_id')->constrained('governorates');
        $table->foreignId('registered_district_id')->constrained('districts');

        // Informational only (does not affect voting)
        $table->text('current_residence_text')->nullable();

        $table->enum('civil_rights_status', ['full', 'restricted'])->default('full');
        $table->enum('eligibility_status', ['eligible', 'ineligible', 'suspended'])->default('eligible');
        $table->text('ineligibility_reason')->nullable();

        $table->timestamps();

        $table->index(['registered_governorate_id']);
        $table->index(['registered_district_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('voters');
    }
};
