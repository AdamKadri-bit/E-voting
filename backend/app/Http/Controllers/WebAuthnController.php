<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Auth\WebAuthnService;
use Illuminate\Http\Request;
use Throwable;

/** Passkey enrolment (signed in) and the passkey step of sign-in. */
class WebAuthnController extends Controller
{
    public function __construct(private WebAuthnService $webauthn)
    {
    }

    private function user(Request $request): User
    {
        $user = User::find($request->attributes->get('auth')->sub ?? null);
        abort_unless($user, 401);

        return $user;
    }

    public function index(Request $request)
    {
        return response()->json([
            'credentials' => $this->user($request)->webauthnCredentials()->orderBy('id')
                ->get(['id', 'name', 'created_at', 'last_used_at']),
        ]);
    }

    public function registerOptions(Request $request)
    {
        return response()->json(['options' => $this->webauthn->registrationOptions($this->user($request))]);
    }

    public function register(Request $request)
    {
        $data = $request->validate(['name' => ['nullable', 'string', 'max:80'], 'credential' => ['required', 'array']]);
        try {
            $cred = $this->webauthn->register($this->user($request), $data['credential'], (string) ($data['name'] ?? 'Passkey'));
        } catch (Throwable $e) {
            return response()->json(['message' => 'Passkey could not be registered: ' . $e->getMessage()], 422);
        }

        return response()->json(['ok' => true, 'credential' => $cred->only(['id', 'name', 'created_at'])], 201);
    }

    public function destroy(Request $request, int $id)
    {
        $deleted = $this->user($request)->webauthnCredentials()->where('id', $id)->delete();

        return response()->json(['ok' => $deleted > 0], $deleted ? 200 : 404);
    }

    public function loginOptions(Request $request)
    {
        $data = $request->validate(['challenge_token' => ['required', 'string', 'size:48']]);
        try {
            return response()->json(['options' => $this->webauthn->loginOptions($data['challenge_token'])]);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }
    }

    public function loginVerify(Request $request, AuthController $auth)
    {
        $data = $request->validate(['challenge_token' => ['required', 'string', 'size:48'], 'credential' => ['required', 'array']]);
        try {
            $user = $this->webauthn->finishLogin($data['challenge_token'], $data['credential']);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Passkey check failed: ' . $e->getMessage()], 401);
        }

        return $auth->issueSession($user);
    }
}
