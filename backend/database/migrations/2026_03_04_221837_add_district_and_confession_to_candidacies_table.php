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
        Schema::table('candidacies', function (Blueprint $table) {
            // Candidate's qadaa (needed for preferential vote restriction)
            $table->foreignId('district_id')
                ->nullable()
                ->after('constituency_id')
                ->constrained('districts')
                ->restrictOnDelete();

            // Candidate runs for a seat type (confession) for THIS election
            $table->foreignId('confession_id')
                ->nullable()
                ->after('district_id')
                ->constrained('confessions')
                ->restrictOnDelete();

            $table->index(['district_id']);
            $table->index(['confession_id']);
        });
    }

    public function down(): void
    {
        Schema::table('candidacies', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confession_id');
            $table->dropConstrainedForeignId('district_id');
        });
    }
};
