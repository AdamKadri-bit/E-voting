<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registry_people', function (Blueprint $table) {
            $table->id();

            $table->string('full_name_en')->nullable();
            $table->string('full_name_ar')->nullable();

            $table->string('father_name_en')->nullable();
            $table->string('father_name_ar')->nullable();

            $table->string('mother_name_en')->nullable();
            $table->string('mother_name_ar')->nullable();

            $table->date('date_of_birth')->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();

            $table->string('civil_registry_number')->unique();
            $table->string('governorate')->nullable();
            $table->string('district')->nullable();
            $table->string('locality')->nullable();

            $table->string('polling_center_name')->nullable();
            $table->string('polling_station_code')->nullable();

            $table->unsignedBigInteger('constituency_id')->nullable();

            $table->boolean('is_eligible')->default(true);
            $table->boolean('has_voted')->default(false);

            $table->timestamps();

            $table->foreign('constituency_id')
                ->references('id')
                ->on('constituencies')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registry_people');
    }
};