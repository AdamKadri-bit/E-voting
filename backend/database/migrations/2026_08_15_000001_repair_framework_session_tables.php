<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rebuilds `sessions` and `password_reset_tokens` on databases that were
 * migrated while those two migrations were still stubs holding only an `id`
 * and timestamps.
 *
 * Fixing the original migrations only helps a database built from scratch;
 * every machine that had already run them kept the broken tables, and every
 * request that touched the session died with:
 *
 *   SQLSTATE[HY000]: General error: 1 no such column: payload
 *
 * Both tables carry framework state only — sessions are recreated on the next
 * request, and the stub table could never have stored a reset token — so they
 * are dropped and recreated rather than patched column by column.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('sessions') || !Schema::hasColumn('sessions', 'payload')) {
            Schema::dropIfExists('sessions');

            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        if (!Schema::hasTable('password_reset_tokens') || !Schema::hasColumn('password_reset_tokens', 'token')) {
            Schema::dropIfExists('password_reset_tokens');

            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    /**
     * Irreversible by design: rolling back would mean restoring tables that
     * cannot serve their own framework driver.
     */
    public function down(): void
    {
    }
};
