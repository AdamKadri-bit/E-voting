<?php

namespace App\Services;

use App\Models\Election;
use App\Models\ElectionParticipation;
use App\Models\ElectoralRollEntry;
use App\Services\Geo\Countries;
use Illuminate\Support\Facades\DB;

/**
 * Turnout and the "where people voted from" map.
 *
 * Everything is aggregated from election_participations filtered by
 * election_id — so the map counts people who cast a ballot in THIS election,
 * never registered users. Public views suppress small country cells so a lone
 * voter in a small country can't be singled out; admins see exact figures plus
 * the location-mismatch count (a bare number, not linked to anyone).
 */
class ParticipationAnalyticsService
{
    public function __construct(private Countries $countries)
    {
    }

    public function turnout(Election $election, bool $admin = false, string $mode = 'declared'): array
    {
        $mode = $mode === 'detected' ? 'detected' : 'declared';
        $base = ElectionParticipation::where('election_id', $election->id);

        $total = (clone $base)->count();
        $byType = (clone $base)->select('voter_type', DB::raw('COUNT(*) as n'))->groupBy('voter_type')->pluck('n', 'voter_type');
        $column = $mode === 'declared' ? 'declared_country' : 'ip_country';
        $rows = (clone $base)->select($column . ' as code', DB::raw('COUNT(*) as n'))->groupBy($column)->get();

        $min = max(1, (int) config('evoting.public_min_cell', 5));
        $unknown = 0;
        $countries = [];
        foreach ($rows as $r) {
            if ($r->code === null) {
                $unknown += (int) $r->n;
                continue;
            }
            $n = (int) $r->n;
            $suppressed = !$admin && $n < $min;
            $countries[] = [
                'code' => $r->code,
                'name' => $this->countries->name($r->code),
                'voters' => $suppressed ? null : $n,
                'suppressed' => $suppressed,
                'share' => $suppressed || $total === 0 ? null : round($n / $total * 100, 2),
            ];
        }
        usort($countries, fn ($a, $b) => ($b['voters'] ?? 0) <=> ($a['voters'] ?? 0) ?: strcmp($a['code'], $b['code']));

        $registered = ElectoralRollEntry::where('election_id', $election->id)->count();

        $out = [
            'election' => [
                'id' => $election->id,
                'title' => $election->title,
                'status' => $election->status,
                'tally_status' => $election->tally_status,
                'diaspora_voting_enabled' => (bool) $election->diaspora_voting_enabled,
            ],
            'mode' => $mode,
            'totals' => [
                'voters' => $total,
                'resident' => (int) ($byType['resident'] ?? 0),
                'diaspora' => (int) ($byType['diaspora'] ?? 0),
                'registered' => $registered,
                'turnout_percentage' => $registered > 0 ? round($total / $registered * 100, 1) : 0.0,
                'countries' => count($countries),
                'unknown_location' => $unknown,
            ],
            'countries' => $countries,
            'suppression_threshold' => $admin ? null : $min,
            'hourly' => (clone $base)->select('coarse_timestamp', DB::raw('COUNT(*) as n'))
                ->groupBy('coarse_timestamp')->orderBy('coarse_timestamp')->get()
                ->map(fn ($r) => ['hour' => $r->coarse_timestamp->toISOString(), 'voters' => (int) $r->n])->all(),
            'generated_at' => now()->toISOString(),
        ];

        if ($admin) {
            $out['totals']['location_mismatches'] = (clone $base)->where('location_mismatch', true)->count();
        }

        return $out;
    }
}
