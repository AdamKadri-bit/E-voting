<?php

namespace App\Services\Geo;

/** IP address → ISO country code, resolved offline. */
interface GeoIpResolver
{
    public function countryFor(?string $ip): ?string;
}
