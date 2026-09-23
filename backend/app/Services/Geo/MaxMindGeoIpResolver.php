<?php

namespace App\Services\Geo;

use MaxMind\Db\Reader;
use Throwable;

/**
 * Looks an IP up in a local MaxMind-format database (GeoLite2 or DB-IP Lite).
 * Nothing is sent anywhere, the IP is not stored, and a missing database or a
 * private/loopback address simply yields null ("unknown") — never an error that
 * could block a vote.
 */
class MaxMindGeoIpResolver implements GeoIpResolver
{
    private ?Reader $reader = null;
    private bool $opened = false;

    public function __construct(private string $path)
    {
    }

    public function countryFor(?string $ip): ?string
    {
        if ($ip === null || !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null;
        }

        try {
            $record = $this->reader()?->get($ip);
        } catch (Throwable) {
            return null;
        }

        $code = $record['country']['iso_code'] ?? null;

        return is_string($code) && preg_match('/^[A-Z]{2}$/', $code) ? $code : null;
    }

    private function reader(): ?Reader
    {
        if (!$this->opened) {
            $this->opened = true;
            if (is_file($this->path)) {
                try {
                    $this->reader = new Reader($this->path);
                } catch (Throwable) {
                    $this->reader = null;
                }
            }
        }

        return $this->reader;
    }
}
