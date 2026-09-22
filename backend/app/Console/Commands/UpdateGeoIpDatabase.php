<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Downloads the free DB-IP "IP to Country Lite" database (CC BY 4.0, MaxMind
 * DB format) for offline GeoIP lookups. Voter data never leaves the server;
 * this only fetches the database file. Set GEOIP_DB_PATH to use a GeoLite2
 * Country file instead.
 */
class UpdateGeoIpDatabase extends Command
{
    protected $signature = 'geoip:update {--month= : YYYY-MM to fetch (default: this month, falling back to last)}';

    protected $description = 'Download the offline country GeoIP database (DB-IP Lite)';

    public function handle(): int
    {
        $target = (string) config('evoting.geoip_path');
        @mkdir(dirname($target), 0755, true);

        $months = $this->option('month') ? [$this->option('month')] : [now()->format('Y-m'), now()->subMonth()->format('Y-m')];
        foreach ($months as $m) {
            $url = "https://download.db-ip.com/free/dbip-country-lite-{$m}.mmdb.gz";
            $this->info("Fetching {$url}");
            $res = Http::timeout(120)->get($url);
            if (!$res->successful()) {
                $this->warn("Not available ({$res->status()}).");
                continue;
            }
            $data = @gzdecode($res->body());
            if ($data === false || strlen($data) < 1000) {
                $this->error('Download was not a valid gzip file.');

                return self::FAILURE;
            }
            file_put_contents($target, $data);
            $this->info('Saved ' . number_format(strlen($data)) . " bytes to {$target}. Attribution: IP geolocation by DB-IP (db-ip.com).");

            return self::SUCCESS;
        }

        $this->error('Could not download the database.');

        return self::FAILURE;
    }
}
