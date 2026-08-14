<?php

namespace Tests\Feature\Admin;

use App\Models\Election;
use App\Models\EncryptedBallot;
use App\Services\BallotTallyService;
use Illuminate\Support\Carbon;

class TurnoutTimelineTest extends AdminTestCase
{
    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_election_without_window_returns_not_started(): void
    {
        // The schema requires starts_at/ends_at, so this state can't be
        // persisted — exercise the guard at the service level instead.
        $election = new Election(['status' => 'draft', 'title' => 'No window']);

        $result = app(BallotTallyService::class)->turnoutTimeline($election);

        $this->assertSame('not_started', $result['status']);
        $this->assertNull($result['window']);
        $this->assertSame([], $result['buckets']);
        $this->assertSame(0, $result['total_ballots']);
    }

    public function test_active_election_buckets_ballots_by_cast_time(): void
    {
        $this->loginAsAdmin();

        $start = Carbon::parse('2026-01-01 00:00:00');
        $end = $start->copy()->addHours(4);

        $election = Election::factory()->create([
            'status' => 'active',
            'starts_at' => $start,
            'ends_at' => $end,
        ]);

        Carbon::setTestNow($end);

        // 4 buckets across a 4-hour window => 1 hour per bucket.
        EncryptedBallot::factory()->create(['election_id' => $election->id, 'cast_at' => $start->copy()->addMinutes(10)]);
        EncryptedBallot::factory()->create(['election_id' => $election->id, 'cast_at' => $start->copy()->addMinutes(30)]);
        EncryptedBallot::factory()->create(['election_id' => $election->id, 'cast_at' => $start->copy()->addHours(3)->addMinutes(5)]);

        $response = $this->getJson("/api/admin/elections/{$election->id}/turnout-timeline?buckets=4");

        $response->assertOk();
        $data = $response->json();

        $this->assertSame(3, $data['total_ballots']);
        $this->assertCount(4, $data['buckets']);
        $this->assertSame(2, $data['buckets'][0]['count']);
        $this->assertSame(0, $data['buckets'][1]['count']);
        $this->assertSame(0, $data['buckets'][2]['count']);
        $this->assertSame(1, $data['buckets'][3]['count']);
    }

    public function test_buckets_query_param_is_clamped(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->withWindow()->create(['status' => 'active']);

        $tooMany = $this->getJson("/api/admin/elections/{$election->id}/turnout-timeline?buckets=1000");
        $tooMany->assertOk();
        $this->assertSame(96, $tooMany->json('window.bucket_count'));

        $tooFew = $this->getJson("/api/admin/elections/{$election->id}/turnout-timeline?buckets=0");
        $tooFew->assertOk();
        $this->assertSame(4, $tooFew->json('window.bucket_count'));
    }

    public function test_closed_election_window_ends_at_ends_at_not_now(): void
    {
        $this->loginAsAdmin();

        $start = Carbon::parse('2026-01-01 00:00:00');
        $end = $start->copy()->addHours(2);

        $election = Election::factory()->create([
            'status' => 'closed',
            'starts_at' => $start,
            'ends_at' => $end,
        ]);

        Carbon::setTestNow($end->copy()->addDays(5));

        $response = $this->getJson("/api/admin/elections/{$election->id}/turnout-timeline");
        $response->assertOk();

        $this->assertSame($end->toISOString(), $response->json('window.to'));
    }

    public function test_response_never_includes_ballot_payload(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->withWindow()->create(['status' => 'active']);
        EncryptedBallot::factory()->create([
            'election_id' => $election->id,
            'cast_at' => now(),
            'encrypted_payload' => 'super-secret-payload-content',
        ]);

        $response = $this->getJson("/api/admin/elections/{$election->id}/turnout-timeline");
        $response->assertOk();

        $response->assertDontSee('super-secret-payload-content');
        $this->assertArrayNotHasKey('encrypted_payload', $response->json());
    }
}
