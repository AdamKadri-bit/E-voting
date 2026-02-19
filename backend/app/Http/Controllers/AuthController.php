<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Firebase\JWT\JWT;

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
        'role' => 'voter', // default role
    ]);

    $user->sendEmailVerificationNotification();

    return response()->json([
        'ok' => true,
        'user_id' => $user->id,
    ]);
}


  public function login(Request $request)
{
    $data = $request->validate([
        'email' => ['required', 'string', 'email'],
        'password' => ['required', 'string'],
    ]);

    $user = User::where('email', $data['email'])->first();

    if (!$user || !Hash::check($data['password'], $user->password)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    if ($user->email_verified_at === null) {
    return response()->json([
        'message' => 'Email not verified',
    ], 403);
}

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

    $token = \Firebase\JWT\JWT::encode($payload, env('JWT_SECRET'), 'HS256');

    $cookie = cookie(
        'access_token',
        $token,
        $ttlMinutes,   // minutes
        '/',
        null,
        false,         // secure (false for localhost)
        true,          // httpOnly
        false,
        'Lax'
    );

    return response()->json([
        'ok' => true,
    ])->withCookie($cookie);
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
        -1,     // expire immediately
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

    // Don't leak whether the email exists (prevents user enumeration)
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
