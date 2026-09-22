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
        //
    }
}
