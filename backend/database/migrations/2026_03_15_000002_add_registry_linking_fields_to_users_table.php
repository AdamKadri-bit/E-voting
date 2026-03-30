<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('registry_person_id')->nullable()->after('id');
            $table->string('verification_status')->default('account_created')->after('registry_person_id');
            $table->boolean('can_vote')->default(false)->after('verification_status');

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
            $table->dropColumn(['registry_person_id', 'verification_status', 'can_vote']);
        });
    }
};