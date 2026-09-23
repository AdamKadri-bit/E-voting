<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;

/**
 * Per-account lockout with exponential backoff, on top of the per-IP route
 * throttle. After `max_attempts` failures the account locks for 1, 2, 4, …
 * minutes (capped). Unknown emails are counted the same way, so the response
 * never reveals whether an account exists.
 */
class LoginThrottle
{
    private function key(string $email, string $suffix): string
    {
        return 'login:' . hash('sha256', strtolower(trim($email))) . ':' . $suffix;
    }

    /** Seconds until the account may try again, or 0. */
    public function lockedFor(string $email): int
    {
        $until = (int) Cache::get($this->key($email, 'until'), 0);

        return max(0, $until - time());
    }

    public function fail(string $email): int
    {
        $cfg = config('evoting.lockout');
        $failures = (int) Cache::get($this->key($email, 'failures'), 0) + 1;

        if ($failures < (int) $cfg['max_attempts']) {
            Cache::put($this->key($email, 'failures'), $failures, now()->addMinutes(15));

            return 0;
        }

        $level = (int) Cache::get($this->key($email, 'level'), 0) + 1;
        $minutes = min((int) $cfg['max_minutes'], (int) $cfg['base_minutes'] * (2 ** ($level - 1)));
        Cache::put($this->key($email, 'level'), $level, now()->addDay());
        Cache::put($this->key($email, 'until'), time() + $minutes * 60, now()->addMinutes($minutes));
        Cache::forget($this->key($email, 'failures'));

        return $minutes * 60;
    }

    public function succeed(string $email): void
    {
        foreach (['failures', 'level', 'until'] as $s) {
            Cache::forget($this->key($email, $s));
        }
    }
}
