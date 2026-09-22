<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Resident vs diaspora voter status, chosen once after sign-in.
 * Nullable so existing accounts are simply prompted on their next sign-in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 'resident' | 'diaspora'; string rather than enum so SQLite and MySQL behave alike.
            $table->string('voter_type', 16)->nullable()->after('can_vote');
            // ISO 3166-1 alpha-2; only set for diaspora voters.
            $table->char('residence_country', 2)->nullable()->after('voter_type');
            $table->timestamp('voter_type_set_at')->nullable()->after('residence_country');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['voter_type', 'residence_country', 'voter_type_set_at']);
        });
    }
};
