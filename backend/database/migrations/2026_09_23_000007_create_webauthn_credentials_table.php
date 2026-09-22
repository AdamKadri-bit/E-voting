<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Registered passkeys / security keys (WebAuthn) used as a second sign-in factor. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webauthn_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            // base64url credential id, as the browser reports it.
            $table->string('credential_id', 512)->unique();
            $table->text('public_key');
            $table->unsignedBigInteger('sign_count')->default(0);
            $table->string('name', 80);
            $table->string('aaguid', 36)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webauthn_credentials');
    }
};
