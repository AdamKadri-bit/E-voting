<?php

namespace Tests\Feature\E2e;

use App\Models\User;
use App\Models\WebauthnCredential;
use Illuminate\Support\Facades\Hash;
use Tests\Feature\Admin\AdminTestCase;

class AuthHardeningTest extends AdminTestCase
{
    private function user(): User
    {
        return User::factory()->create(['email' => 'lock@x.test', 'password' => Hash::make('correct-password'), 'email_verified_at' => now()]);
    }

    public function test_account_locks_after_repeated_failures_with_backoff(): void
    {
        $this->user();
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'nope'])->assertStatus(401);
        }
        $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'nope'])->assertStatus(429)->assertHeader('Retry-After', '60');

        // Even the right password is refused while locked.
        $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'correct-password'])->assertStatus(429);

        $this->travel(61)->seconds();
        $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'correct-password'])->assertOk();
    }

    public function test_second_lockout_doubles(): void
    {
        $this->user();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'nope']);
        }
        $this->travel(61)->seconds();
        for ($i = 0; $i < 5; $i++) {
            $last = $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'nope']);
        }
        $last->assertStatus(429)->assertHeader('Retry-After', '120');
    }

    public function test_unknown_email_is_throttled_the_same_way(): void
    {
        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/auth/login', ['email' => 'ghost@x.test', 'password' => 'x'])->assertStatus(401);
        }
        $this->postJson('/api/auth/login', ['email' => 'ghost@x.test', 'password' => 'x'])->assertStatus(429);
    }

    public function test_login_route_is_rate_limited_per_ip(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', ['email' => "u{$i}@x.test", 'password' => 'x']);
        }
        $this->postJson('/api/auth/login', ['email' => 'u99@x.test', 'password' => 'x'])->assertStatus(429);
    }

    public function test_passkey_account_needs_a_second_step_and_gets_no_cookie_yet(): void
    {
        $u = $this->user();
        WebauthnCredential::create(['user_id' => $u->id, 'credential_id' => 'abc', 'public_key' => 'pem', 'name' => 'Laptop']);

        $r = $this->postJson('/api/auth/login', ['email' => 'lock@x.test', 'password' => 'correct-password'])->assertOk();
        $r->assertJsonPath('two_factor', 'webauthn');
        $this->assertSame(48, strlen($r->json('challenge_token')));
        $r->assertCookieMissing('access_token');

        $this->postJson('/api/auth/webauthn/options', ['challenge_token' => $r->json('challenge_token')])
            ->assertOk()->assertJsonStructure(['options' => ['challenge', 'allowCredentials']]);
        $this->postJson('/api/auth/webauthn/verify', ['challenge_token' => $r->json('challenge_token'), 'credential' => ['id' => 'abc', 'response' => []]])
            ->assertStatus(401);
    }

    public function test_passkey_registration_options_are_issued_to_signed_in_users(): void
    {
        $u = $this->user();
        $this->authenticateAs($u);
        $opts = $this->postJson('/api/webauthn/register/options')->assertOk()->json('options');
        $this->assertSame(config('evoting.webauthn.rp_id'), $opts['rp']['id']);
        $this->assertNotEmpty($opts['challenge']);
        $this->getJson('/api/webauthn/credentials')->assertOk()->assertJsonPath('credentials', []);
    }

    public function test_api_sends_hardening_headers(): void
    {
        $this->getJson('/api/ping')->assertHeader('X-Content-Type-Options', 'nosniff')->assertHeader('X-Frame-Options', 'DENY');
    }
}
