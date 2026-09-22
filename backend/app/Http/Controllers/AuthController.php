<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;
use App\Services\Auth\LoginThrottle;
use App\Services\Auth\WebAuthnService;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'voter',
            'verification_status' => 'account_created',
            'can_vote' => false,
        ]);

        $user->sendEmailVerificationNotification();

        return response()->json([
            'ok' => true,
            'user_id' => $user->id,
        ]);
    }

    public function login(Request $request, LoginThrottle $throttle, WebAuthnService $webauthn)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        // Account-level lockout with exponential backoff (the route also has a per-IP limit).
        if ($wait = $throttle->lockedFor($data['email'])) {
            return $this->lockedResponse($wait);
        }

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            $locked = $throttle->fail($data['email']);

            return $locked > 0
                ? $this->lockedResponse($locked)
                : response()->json(['message' => 'Invalid credentials'], 401);
        }

        $throttle->succeed($data['email']);

        // Keep stored hashes at the current cost as the work factor rises.
        if (Hash::needsRehash($user->password)) {
            $user->forceFill(['password' => Hash::make($data['password'])])->save();
        }

        if ($user->email_verified_at === null) {
            return response()->json([
                'message' => 'Email not verified',
            ], 403);
        }

        // A registered passkey turns sign-in into two steps: no session until it is used.
        if ($user->webauthnCredentials()->exists()) {
            return response()->json([
                'ok' => true,
                'two_factor' => 'webauthn',
                'challenge_token' => $webauthn->beginLogin($user),
            ]);
        }

        return $this->issueSession($user);
    }

    /** Sets the JWT cookie — the single place a session is created. */
    public function issueSession(User $user)
    {
        $now = time();
        $ttlMinutes = (int) env('JWT_TTL_MINUTES', 15);

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified' => $user->email_verified_at !== null,
            'iat' => $now,
            'exp' => $now + ($ttlMinutes * 60),
        ];

        $jwtSecret = (string) env('JWT_SECRET');
        $token = JWT::encode($payload, $jwtSecret, 'HS256');

        $cookie = cookie(
            'access_token',
            $token,
            $ttlMinutes,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );

        return response()->json([
            'ok' => true,
        ])->withCookie($cookie);
    }

    private function lockedResponse(int $seconds)
    {
        $minutes = max(1, (int) ceil($seconds / 60));

        return response()->json([
            'message' => "Too many failed sign-in attempts. Try again in {$minutes} minute(s).",
            'retry_after' => $seconds,
        ], 429)->header('Retry-After', (string) $seconds);
    }

    public function refresh(Request $request)
    {
        return response()->json(['todo' => 'refresh']);
    }

    public function logout(Request $request)
    {
        $cookie = cookie(
            'access_token',
            '',
            -1,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );

        return response()->json(['ok' => true])->withCookie($cookie);
    }

    public function resendVerification(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user) {
            return response()->json(['ok' => true]);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json(['ok' => true, 'already_verified' => true]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['ok' => true]);
    }
}