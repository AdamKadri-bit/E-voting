<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogService
{
    public function log(
        ?User $actor,
        string $action,
        array $metadata = [],
        ?Request $request = null
    ): AuditLog {
        $last = AuditLog::query()
            ->orderByDesc('id')
            ->first();

        $prevHash = $last?->entry_hash;

        $payload = [
            'actor_user_id' => $actor?->id,
            'action' => $action,
            'metadata_json' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'prev_hash' => $prevHash,
            'created_at' => now()->toISOString(),
        ];

        $entryHash = hash(
            'sha256',
            json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );

        return AuditLog::create([
            'actor_user_id' => $actor?->id,
            'action' => $action,
            'metadata_json' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'prev_hash' => $prevHash,
            'entry_hash' => $entryHash,
            'created_at' => now(),
        ]);
    }
}