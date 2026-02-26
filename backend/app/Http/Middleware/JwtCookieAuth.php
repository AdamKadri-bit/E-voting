<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtCookieAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
   public function handle($request, \Closure $next)
{
    $token = $request->cookie('access_token');

    if (!$token) {
        return response()->json(['message' => 'Unauthenticated'], 401);
    }

    try {
        $jwtSecret = (string) env('JWT_SECRET');
        $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key($jwtSecret, 'HS256'));

        // Attach decoded claims so controllers/routes can use them
        $request->attributes->set('auth', $decoded);
    } catch (\Throwable $e) {
        return response()->json(['message' => 'Invalid token'], 401);
    }

    return $next($request);
}
}
