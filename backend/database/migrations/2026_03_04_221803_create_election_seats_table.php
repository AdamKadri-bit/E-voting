<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_seats', function (Blueprint $table) {
            $table->id();

            $table->foreignId('election_id')
                ->constrained('elections')
                ->cascadeOnDelete();

            $table->foreignId('constituency_id')
                ->constrained('constituencies')
                ->cascadeOnDelete();

            $table->foreignId('district_id')
                ->constrained('districts')
                ->restrictOnDelete();

            $table->foreignId('confession_id')
                ->constrained('confessions')
                ->restrictOnDelete();

            $table->unsignedSmallInteger('seat_count');

            $table->timestamps();

            $table->unique(
                ['election_id', 'constituency_id', 'district_id', 'confession_id'],
                'uq_election_seats_scope'
            );

            $table->index(['election_id', 'constituency_id']);
            $table->index(['district_id']);
            $table->index(['confession_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('election_seats');
    }
};