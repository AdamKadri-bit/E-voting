<?php

namespace App\Services\Geo;

/**
 * ISO 3166-1 alpha-2 country list, bundled from i18n-iso-countries by
 * frontend/scripts/gen-geo-data.ts (the frontend ships the identical file).
 */
class Countries
{
    private ?array $byCode = null;

    public function all(): array
    {
        if ($this->byCode === null) {
            $list = json_decode(file_get_contents(resource_path('data/countries.json')), true);
            $this->byCode = collect($list)->keyBy('code')->all();
        }

        return $this->byCode;
    }

    public function exists(?string $code): bool
    {
        return $code !== null && isset($this->all()[$code]);
    }

    public function name(?string $code): ?string
    {
        return $code === null ? null : ($this->all()[$code]['name'] ?? $code);
    }
}
