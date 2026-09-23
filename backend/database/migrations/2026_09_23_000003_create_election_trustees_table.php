<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trustees of one election and their public key-ceremony output. No column
 * here ever holds a private key: trustees keep those in an encrypted file.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('election_trustees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('trustee_index');

            // Round 1: communication key + polynomial commitments, each with a Schnorr proof.
            $table->json('round1')->nullable();
            $table->timestamp('round1_at')->nullable();
            // Round 2: sealed shares sent (stored in trustee_share_transfers).
            $table->timestamp('round2_at')->nullable();
            // Round 3: shares received and checked; s_j·G published.
            $table->char('share_public_key', 64)->nullable();
            $table->json('complaints')->nullable();
            $table->timestamp('round3_at')->nullable();

            $table->timestamps();

            $table->unique(['election_id', 'user_id']);
            $table->unique(['election_id', 'trustee_index']);
        });

        Schema::create('trustee_share_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('election_id')->constrained('elections')->cascadeOnDelete();
            $table->unsignedTinyInteger('from_index');
            $table->unsignedTinyInteger('to_index');
            // ECIES box (ephemeral point, nonce, AES-GCM ciphertext) — opaque to the server.
            $table->json('box');
            $table->timestamps();

            $table->unique(['election_id', 'from_index', 'to_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trustee_share_transfers');
        Schema::dropIfExists('election_trustees');
    }
};
