<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
     public function up(): void
    {
        Schema::table('lists', function (Blueprint $table) {
            // stable key used in code (unique within election+constituency)
            $table->string('list_code', 160)->nullable()->after('constituency_id');

            // bilingual names (official display)
            $table->string('list_name_en', 255)->nullable()->after('list_code');
            $table->string('list_name_ar', 255)->nullable()->after('list_name_en');

            // optional metadata (best practice)
            $table->boolean('is_withdrawn')->default(false)->after('list_name_ar');
            $table->string('source_ref', 255)->nullable()->after('is_withdrawn');
        });

        // Backfill for existing rows: list_name -> list_name_en + list_code
        $rows = DB::table('lists')->select('id', 'election_id', 'constituency_id', 'list_name')->get();

        foreach ($rows as $r) {
            $base = Str::slug((string) $r->list_name, '_');
            if ($base === '') $base = 'list';

            $code = strtoupper($r->election_id . '_' . $r->constituency_id . '_' . $base);
            if (strlen($code) > 160) {
                $code = substr($code, 0, 160);
            }

            DB::table('lists')->where('id', $r->id)->update([
                'list_code' => $code,
                'list_name_en' => $r->list_name, // keep same as legacy for now
                'updated_at' => now(),
            ]);
        }

        // Add uniqueness on the stable code scope
        Schema::table('lists', function (Blueprint $table) {
            $table->unique(['election_id', 'constituency_id', 'list_code'], 'uq_list_code_scope');
            $table->index(['election_id', 'constituency_id']);
        });
    }

    public function down(): void
    {
        Schema::table('lists', function (Blueprint $table) {
            $table->dropUnique('uq_list_code_scope');
            $table->dropIndex(['election_id', 'constituency_id']);

            $table->dropColumn(['list_code', 'list_name_en', 'list_name_ar', 'is_withdrawn', 'source_ref']);
        });
    }
};
