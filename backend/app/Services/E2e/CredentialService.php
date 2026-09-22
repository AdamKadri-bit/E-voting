<?php

namespace App\Services\E2e;

/**
 * Per-election pseudonymous voter credential: HMAC-SHA256(key, election|voter).
 *
 * The bulletin board links ballots only through this value, so a re-vote can
 * supersede the earlier ballot without the board ever naming the voter. The
 * mapping back to a person needs this key and the voters table; since no
 * individual ballot is ever decrypted, even that mapping reveals no vote.
 */
class CredentialService
{
    public function credentialFor(int $electionId, int $voterId): string
    {
        return hash_hmac('sha256', "evote-v1|credential|{$electionId}|{$voterId}", $this->key());
    }

    private function key(): string
    {
        $configured = config('evoting.credential_key');
        if (is_string($configured) && $configured !== '') {
            return $configured;
        }

        return hash_hmac('sha256', 'evote-v1|credential-key', (string) config('app.key'));
    }
}
