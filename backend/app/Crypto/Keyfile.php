<?php

namespace App\Crypto;

/**
 * Writes trustee key files in the browser's format (Argon2id → AES-256-GCM).
 * Real trustees create theirs in the browser; this exists so the demo seeder
 * can hand the seeded demo trustees a usable file. Never used on live data.
 */
final class Keyfile
{
    public static function seal(int $electionId, int $trusteeIndex, string $kind, array $secret, string $passphrase, int $t = 3, int $mKiB = 65536): array
    {
        $meta = [
            'format' => 'evote-keyfile-v1',
            'kind' => $kind,
            'election_id' => $electionId,
            'trustee_index' => $trusteeIndex,
            'created_at' => now()->toISOString(),
        ];
        $salt = random_bytes(16);
        $nonce = random_bytes(12);
        $key = sodium_crypto_pwhash(32, $passphrase, $salt, $t, $mKiB * 1024, SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13);
        $aad = implode('|', [$meta['format'], $meta['kind'], $meta['election_id'], $meta['trustee_index'], $meta['created_at']]);
        $tag = '';
        $ct = openssl_encrypt(json_encode($secret), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, $aad, 16);

        return [
            'meta' => $meta,
            'kdf' => ['name' => 'argon2id', 't' => $t, 'm' => $mKiB, 'p' => 1, 'salt' => bin2hex($salt)],
            'cipher' => ['name' => 'aes-256-gcm', 'nonce' => bin2hex($nonce)],
            'ciphertext' => bin2hex($ct . $tag),
        ];
    }
}
