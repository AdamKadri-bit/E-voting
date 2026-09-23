<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistryPerson extends Model
{
    protected $table = 'registry_people';

    protected $fillable = [
        'full_name_en',
        'full_name_ar',
        'father_name_en',
        'father_name_ar',
        'mother_name_en',
        'mother_name_ar',
        'date_of_birth',
        'gender',
        'civil_registry_number',
        'governorate',
        'district',
        'locality',
        'polling_center_name',
        'polling_station_code',
        'constituency_id',
        'is_eligible',
        'has_voted',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'is_eligible' => 'boolean',
        'has_voted' => 'boolean',
    ];

    public function constituency(): BelongsTo
    {
        return $this->belongsTo(Constituency::class);
    }

    /** Key under which this person appears on electoral rolls built from the registry. */
    public function rollKey(): string
    {
        return 'REG-' . $this->id;
    }

    /**
     * The minor district this person votes in: the registry's district name
     * when it names a real district, otherwise the first district of the
     * registry constituency.
     */
    public function resolveDistrict(): ?District
    {
        if ($this->district) {
            $byName = District::query()
                ->whereRaw('LOWER(name_en) = ?', [mb_strtolower(trim($this->district))])
                ->orWhere('name_ar', trim($this->district))
                ->first();
            if ($byName) {
                return $byName;
            }
        }

        if ($this->constituency_id) {
            return District::query()
                ->join('constituency_districts', 'constituency_districts.district_id', '=', 'districts.id')
                ->where('constituency_districts.constituency_id', $this->constituency_id)
                ->orderBy('districts.id')
                ->select('districts.*')
                ->first();
        }

        return null;
    }

    /** [first name, last name] from the English full name, else the Arabic one. */
    public function nameParts(): array
    {
        $full = trim((string) ($this->full_name_en ?: $this->full_name_ar));
        $parts = preg_split('/\s+/u', $full, 2) ?: [''];

        return [$parts[0] ?? '', $parts[1] ?? ''];
    }
}