<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Base for admin feature tests. Auth here is a custom JWT-in-cookie scheme
 * (JwtCookieAuth + EnsureAdmin), not Sanctum, so Laravel's actingAs() won't
 * satisfy the middleware — tests mint a real JWT and attach it as a cookie,
 * mirroring what AuthController::login does.
 */
abstract class AdminTestCase extends TestCase
{
    use RefreshDatabase;

    protected function loginAsAdmin(array $attributes = []): User
    {
        $admin = User::factory()->create(array_merge([
            'role' => 'admin',
            'email_verified_at' => now(),
        ], $attributes));

        $this->authenticateAs($admin);

        return $admin;
    }

    /**
     * Attaches the JWT cookie. withCredentials() is required because the
     * json* test helpers only send cookies when credentials are enabled.
     */
    protected function authenticateAs(User $user): void
    {
        $this->withCredentials()
            ->withUnencryptedCookie('access_token', $this->mintToken($user));
    }

    protected function mintToken(User $user, int $ttlMinutes = 15): string
    {
        $now = time();

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified' => $user->email_verified_at !== null,
            'iat' => $now,
            'exp' => $now + ($ttlMinutes * 60),
        ];

        return JWT::encode($payload, (string) env('JWT_SECRET'), 'HS256');
    }
}
