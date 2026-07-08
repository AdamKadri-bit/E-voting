<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authorizes admin-only routes.
 *
 * Runs after the `jwt.cookie` middleware, which decodes the JWT and stores the
 * claims under the `auth` request attribute. The role is re-checked against the
 * database (authoritative) rather than trusting the token alone.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $auth = $request->attributes->get('auth');

        if (!$auth || !isset($auth->sub)) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $user = User::find($auth->sub);

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Admin access required'], 403);
        }

        // Make the resolved admin available to controllers without re-querying.
        $request->attributes->set('admin_user', $user);

        return $next($request);
    }
}
