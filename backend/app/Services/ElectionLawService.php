<?php

namespace App\Services;

use App\Models\Election;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Statutory polling hours.
 *
 * Lebanese electoral law fixes when the polls close rather than leaving it
 * to whoever creates the election: parliamentary polling under Law 44/2017
 * runs 07:00–19:00 on polling day, and municipal polling under Law 665/1997
 * keeps the same hours. So an election only needs a start; its end is
 * derived here, and once that moment passes the election closes itself
 * (see Election::autoCloseExpired()).
 */
class ElectionLawService
{
    /** Hour of day (local time) at which polls close, per election type. */
    private const CLOSING_HOUR = [
        'parliamentary' => 19,
        'municipal' => 19,
    ];

    /** Fallback window length when a type has no statutory closing hour. */
    private const DEFAULT_DURATION_HOURS = 12;

    private const LAW_REF = [
        'parliamentary' => 'Law 44/2017',
        'municipal' => 'Law 665/1997',
    ];

    /**
     * The moment polling must stop, given when it starts.
     *
     * Normally that's the statutory closing hour on the same calendar day.
     * If polling is scheduled to open at or after that hour (an out-of-hours
     * or multi-day exercise), the default window length is used instead so
     * the end never lands before the start.
     */
    public function statutoryEnd(string $type, CarbonInterface $startsAt): Carbon
    {
        $start = Carbon::instance($startsAt->toDateTime());
        $closingHour = self::CLOSING_HOUR[$type] ?? null;

        if ($closingHour === null) {
            return $start->copy()->addHours(self::DEFAULT_DURATION_HOURS);
        }

        $end = $start->copy()->setTime($closingHour, 0, 0);

        return $end->greaterThan($start)
            ? $end
            : $start->copy()->addHours(self::DEFAULT_DURATION_HOURS);
    }

    /** Statutory end for an election, from its own type and start time. */
    public function statutoryEndFor(Election $election): ?Carbon
    {
        if (!$election->starts_at) {
            return null;
        }

        return $this->statutoryEnd($election->type, $election->starts_at);
    }

    /** Law the statutory hours come from, for display and audit metadata. */
    public function lawRef(string $type): ?string
    {
        return self::LAW_REF[$type] ?? null;
    }

    /** Whether an election's end time matches what the law prescribes. */
    public function endsAtIsStatutory(Election $election): bool
    {
        $statutory = $this->statutoryEndFor($election);

        return $statutory !== null
            && $election->ends_at !== null
            && $statutory->equalTo($election->ends_at);
    }
}
