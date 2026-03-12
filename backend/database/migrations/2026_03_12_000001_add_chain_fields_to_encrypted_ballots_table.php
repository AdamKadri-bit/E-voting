<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('encrypted_ballots', function (Blueprint $table) {
            $table->unsignedBigInteger('chain_index')->nullable()->after('id');
            $table->string('previous_hash', 64)->nullable()->after('receipt_hash');
            $table->string('block_hash', 64)->nullable()->after('previous_hash');

            $table->unique('chain_index');
            $table->unique('block_hash');
        });
    }

    public function down(): void
    {
        Schema::table('encrypted_ballots', function (Blueprint $table) {
            $table->dropUnique(['chain_index']);
            $table->dropUnique(['block_hash']);

            $table->dropColumn([
                'chain_index',
                'previous_hash',
                'block_hash',
            ]);
        });
    }
};