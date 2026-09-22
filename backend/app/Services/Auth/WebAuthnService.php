<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Models\WebauthnCredential;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use lbuchs\WebAuthn\Binary\ByteBuffer;
use lbuchs\WebAuthn\WebAuthn;
use RuntimeException;

/**
 * Passkeys / security keys (WebAuthn) as a phishing-resistant second factor.
 * Built on lbuchs/webauthn, which does the attestation and signature checks;
 * this class only keeps challenges (single-use, 5 minutes) and credentials.
 */
class WebAuthnService
{
    private function lib(): WebAuthn
    {
        return new WebAuthn(config('evoting.webauthn.rp_name'), config('evoting.webauthn.rp_id'), null, true);
    }

    private static function b64u(string $s): string
    {
        return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    }

    private static function unb64u(mixed $s): string
    {
        if (!is_string($s) || $s === '') {
            throw new RuntimeException('Malformed WebAuthn response.');
        }
        $out = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
        if ($out === false) {
            throw new RuntimeException('Malformed WebAuthn response.');
        }

        return $out;
    }

    public function registrationOptions(User $user): array
    {
        $wa = $this->lib();
        $exclude = $user->webauthnCredentials()->pluck('credential_id')->map(fn ($id) => self::unb64u($id))->all();
        $args = $wa->getCreateArgs((string) $user->id, $user->email, $user->name, 120, false, 'preferred', null, $exclude);
        Cache::put("webauthn:reg:{$user->id}", $wa->getChallenge()->getBinaryString(), now()->addMinutes(5));

        return json_decode(json_encode($args), true)['publicKey'];
    }

    public function register(User $user, array $credential, string $name): WebauthnCredential
    {
        $challenge = Cache::pull("webauthn:reg:{$user->id}");
        if (!$challenge) {
            throw new RuntimeException('Registration expired. Start again.');
        }
        $resp = $credential['response'] ?? [];
        $data = $this->lib()->processCreate(
            self::unb64u($resp['clientDataJSON'] ?? null),
            self::unb64u($resp['attestationObject'] ?? null),
            new ByteBuffer($challenge),
            false,
            true,
            false
        );

        return $user->webauthnCredentials()->create([
            'credential_id' => self::b64u($data->credentialId),
            'public_key' => $data->credentialPublicKey,
            'sign_count' => (int) ($data->signatureCounter ?? 0),
            'name' => Str::limit(trim($name) ?: 'Passkey', 80, ''),
            'aaguid' => isset($data->AAGUID) ? bin2hex($data->AAGUID) : null,
        ]);
    }

    /** Starts the second step of sign-in; returns an opaque token bound to this user. */
    public function beginLogin(User $user): string
    {
        $token = Str::random(48);
        Cache::put("webauthn:login:{$token}", $user->id, now()->addMinutes(5));

        return $token;
    }

    public function loginOptions(string $token): array
    {
        $userId = Cache::get("webauthn:login:{$token}");
        $user = $userId ? User::find($userId) : null;
        if (!$user) {
            throw new RuntimeException('Sign-in expired. Enter your password again.');
        }
        $wa = $this->lib();
        $ids = $user->webauthnCredentials()->pluck('credential_id')->map(fn ($id) => self::unb64u($id))->all();
        $args = $wa->getGetArgs($ids, 120, true, true, true, true, true, 'preferred');
        Cache::put("webauthn:login:{$token}:challenge", $wa->getChallenge()->getBinaryString(), now()->addMinutes(5));

        return json_decode(json_encode($args), true)['publicKey'];
    }

    public function finishLogin(string $token, array $assertion): User
    {
        $userId = Cache::pull("webauthn:login:{$token}");
        $challenge = Cache::pull("webauthn:login:{$token}:challenge");
        $user = $userId ? User::find($userId) : null;
        if (!$user || !$challenge) {
            throw new RuntimeException('Sign-in expired. Enter your password again.');
        }

        $cred = $user->webauthnCredentials()->where('credential_id', $assertion['id'] ?? '')->first();
        if (!$cred) {
            throw new RuntimeException('This passkey is not registered to your account.');
        }

        $resp = $assertion['response'] ?? [];
        $wa = $this->lib();
        $wa->processGet(
            self::unb64u($resp['clientDataJSON'] ?? null),
            self::unb64u($resp['authenticatorData'] ?? null),
            self::unb64u($resp['signature'] ?? null),
            $cred->public_key,
            new ByteBuffer($challenge),
            $cred->sign_count ?: null,
            false
        );

        $cred->update(['sign_count' => (int) ($wa->getSignatureCounter() ?? $cred->sign_count), 'last_used_at' => now()]);

        return $user;
    }
}
