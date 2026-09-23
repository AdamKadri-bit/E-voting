<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Offline GeoIP lookups for the participation map (no third-party API).
        $this->app->singleton(
            \App\Services\Geo\GeoIpResolver::class,
            fn () => new \App\Services\Geo\MaxMindGeoIpResolver((string) config('evoting.geoip_path'))
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Named per-IP limiters for auth and voting endpoints (see config/evoting.php).
        foreach (['login', 'register', 'ballot', 'audit', 'board', 'export'] as $name) {
            \Illuminate\Support\Facades\RateLimiter::for($name, fn (\Illuminate\Http\Request $request) => \Illuminate\Cache\RateLimiting\Limit::perMinute((int) config("evoting.rate_limits.{$name}"))->by($name . '|' . $request->ip()));
        }
    }
}
