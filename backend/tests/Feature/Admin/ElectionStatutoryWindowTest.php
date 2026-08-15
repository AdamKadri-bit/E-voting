<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\Election;
use App\Services\ElectionLawService;
use Illuminate\Support\Carbon;

class ElectionStatutoryWindowTest extends AdminTestCase
{
    public function test_created_election_without_end_time_closes_at_the_statutory_hour(): void
    {
        $this->loginAsAdmin();

        $response = $this->postJson('/api/admin/elections', [
            'type' => 'parliamentary',
            'law_ref' => 'Law 44/2017',
            'title' => 'Statutory window',
            'starts_at' => '2027-05-16 07:00:00',
            'status' => 'draft',
        ]);

        $response->assertStatus(201);

        $election = Election::find($response->json('election.id'));

        // Law 44/2017: polling day runs 07:00 to 19:00.
        $this->assertSame('2027-05-16 19:00:00', $election->ends_at->toDateTimeString());
    }

    public function test_explicit_end_time_is_kept(): void
    {
        $this->loginAsAdmin();

        $response = $this->postJson('/api/admin/elections', [
            'type' => 'parliamentary',
            'title' => 'Manual window',
            'starts_at' => '2027-05-16 07:00:00',
            'ends_at' => '2027-05-16 21:30:00',
            'status' => 'draft',
        ]);

        $response->assertStatus(201);

        $election = Election::find($response->json('election.id'));

        $this->assertSame('2027-05-16 21:30:00', $election->ends_at->toDateTimeString());
    }

    public function test_start_after_the_statutory_hour_falls_back_to_a_full_window(): void
    {
        $law = app(ElectionLawService::class);

        $end = $law->statutoryEnd('parliamentary', Carbon::parse('2027-05-16 20:00:00'));

        $this->assertSame('2027-05-17 08:00:00', $end->toDateTimeString());
    }

    public function test_other_election_types_get_the_default_window(): void
    {
        $law = app(ElectionLawService::class);

        $end = $law->statutoryEnd('other', Carbon::parse('2027-05-16 07:00:00'));

        $this->assertSame('2027-05-16 19:00:00', $end->toDateTimeString());
    }

    public function test_active_election_past_its_window_closes_itself(): void
    {
        $election = Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHours(13),
            'ends_at' => now()->subHour(),
        ]);

        $closed = Election::autoCloseExpired();

        $this->assertSame(1, $closed);
        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'closed']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'election.auto_closed']);
    }

    public function test_election_still_inside_its_window_stays_active(): void
    {
        $election = Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);

        $this->assertSame(0, Election::autoCloseExpired());
        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'active']);
    }

    public function test_auto_close_runs_when_the_admin_lists_elections(): void
    {
        $this->loginAsAdmin();

        $election = Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHours(13),
            'ends_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/admin/elections')->assertOk();

        $this->assertDatabaseHas('elections', ['id' => $election->id, 'status' => 'closed']);
    }

    public function test_auto_close_command_reports_what_it_closed(): void
    {
        Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHours(13),
            'ends_at' => now()->subHour(),
        ]);

        $this->artisan('elections:auto-close')
            ->expectsOutputToContain('Closed 1 election(s)')
            ->assertSuccessful();
    }

    public function test_auto_close_only_logs_when_something_closed(): void
    {
        Election::factory()->create([
            'status' => 'active',
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
        ]);

        Election::autoCloseExpired();

        $this->assertSame(0, AuditLog::where('action', 'election.auto_closed')->count());
    }
}
