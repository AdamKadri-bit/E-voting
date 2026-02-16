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
    Schema::create('encrypted_ballots', function (Blueprint $table) {
        $table->id();

        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
        $table->foreignId('constituency_id')->constrained('constituencies')->cascadeOnDelete();

        $table->longText('encrypted_payload');
        $table->char('payload_hash', 64);

        $table->char('receipt_hash', 64)->unique();

        $table->dateTime('cast_at');

        $table->timestamps();

        $table->index(['election_id']);
        $table->index(['constituency_id']);
        $table->index(['cast_at']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('encrypted_ballots');
    }
};
