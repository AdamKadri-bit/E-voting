<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('electoral_roll_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('election_id')
                ->constrained('elections')
                ->cascadeOnDelete();

            $table->string('national_id_number', 32);

            $table->string('first_name', 80);
            $table->string('father_name', 80);
            $table->string('last_name', 80);
            $table->string('mother_full_name', 160)->nullable();

            $table->date('date_of_birth');

            $table->foreignId('registered_governorate_id')
                ->constrained('governorates')
                ->restrictOnDelete();

            $table->foreignId('registered_district_id')
                ->constrained('districts')
                ->restrictOnDelete();

            $table->enum('civil_rights_status', ['full', 'restricted'])->default('full');
            $table->enum('eligibility_status', ['eligible', 'ineligible', 'suspended'])->default('eligible');
            $table->text('ineligibility_reason')->nullable();

            $table->timestamps();

            $table->unique(['election_id', 'national_id_number'], 'uq_roll_entry_per_election');

            $table->index(['election_id']);
            $table->index(['registered_governorate_id']);
            $table->index(['registered_district_id']);
            $table->index(['eligibility_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('electoral_roll_entries');
    }
};