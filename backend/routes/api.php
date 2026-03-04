<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;


Route::get('/ping', function () {
    return response()->json(['ok' => true]);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/refresh', [AuthController::class, 'refresh']);
Route::post('/auth/logout', [AuthController::class, 'logout']);

Route::get('/me', function (Request $request) {
    $auth = $request->attributes->get('auth');

    if (!$auth || !isset($auth->sub)) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    $user = \App\Models\User::find($auth->sub);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 401);
    }

    return response()->json([
        'ok' => true,
        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified_at' => $user->email_verified_at,
            'email_verified' => $user->hasVerifiedEmail(),
        ],
    ]);
})->middleware('jwt.cookie');

Route::post('/email/verification-notification', function (Request $request) {
    $auth = $request->attributes->get('auth');
    $user = \App\Models\User::find($auth->sub);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 404);
    }

    if ($user->hasVerifiedEmail()) {
        return response()->json(['message' => 'Already verified'], 200);
    }

    $user->sendEmailVerificationNotification();

    return response()->json(['ok' => true]);
})->middleware('jwt.cookie');

Route::get('/verify-email/{id}/{hash}', function (Request $request, $id, $hash) {
    $user = \App\Models\User::find($id);

    if (!$user) {
        return response()->json(['message' => 'User not found'], 404);
    }

    if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
        return response()->json(['message' => 'Invalid verification link'], 403);
    }

    if ($user->hasVerifiedEmail()) {
        return response()->json(['ok' => true, 'already_verified' => true]);
    }

    $user->markEmailAsVerified();
    event(new \Illuminate\Auth\Events\Verified($user));

    return response()->json(['ok' => true]);
})->middleware('signed')->name('verification.verify');

Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification'])
    ->middleware('throttle:6,1');
