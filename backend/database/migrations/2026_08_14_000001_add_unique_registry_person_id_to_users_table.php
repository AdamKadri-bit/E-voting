<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A voter registry record represents one real person, so at most one
     * platform account may claim it. Without this constraint two accounts can
     * verify against the same national ID and both become eligible to vote.
     *
     * MySQL permits any number of NULLs in a unique index, so accounts that
     * have not verified yet are unaffected.
     *
     * The foreign key added in 2026_03_15_000002 is backed by an index on the
     * same column. MySQL will not let that index be replaced while the
     * constraint references it, so the key is dropped and recreated around the
     * change in both directions.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['registry_person_id']);
            $table->unique('registry_person_id');

            $table->foreign('registry_person_id')
                ->references('id')
                ->on('registry_people')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['registry_person_id']);
            $table->dropUnique(['registry_person_id']);

            $table->foreign('registry_person_id')
                ->references('id')
                ->on('registry_people')
                ->nullOnDelete();
        });
    }
};
