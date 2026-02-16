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
    Schema::create('audit_logs', function (Blueprint $table) {
        $table->id();

        $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();

        $table->string('action', 150);
        $table->json('metadata_json')->nullable();

        $table->string('ip_address', 45)->nullable();
        $table->text('user_agent')->nullable();

        // for future tamper-evident chain
        $table->char('prev_hash', 64)->nullable();
        $table->char('entry_hash', 64)->nullable();

        $table->timestamp('created_at')->useCurrent();

        $table->index(['actor_user_id']);
        $table->index(['action']);
        $table->index(['created_at']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
