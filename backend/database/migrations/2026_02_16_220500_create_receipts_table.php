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
    Schema::create('receipts', function (Blueprint $table) {
        $table->id();

        $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();

        $table->char('receipt_hash', 64)->unique();
        $table->dateTime('issued_at');

        $table->timestamps();

        $table->index(['election_id']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
