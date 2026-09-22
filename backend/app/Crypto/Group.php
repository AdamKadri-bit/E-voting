<?php

namespace App\Crypto;

use InvalidArgumentException;

/**
 * ristretto255 helpers on top of libsodium (ext-sodium).
 *
 * This is the server-side twin of frontend/src/crypto/group.ts. The group and
 * its encoding are fixed by RFC 9496, so libsodium here and @noble/curves in the
 * browser agree byte-for-byte; tests/Fixtures/crypto-vectors.json (produced by
 * the TypeScript code) proves it. No curve arithmetic is implemented here —
 * every operation is a libsodium call; this class only pins down encodings and
 * the two edge cases libsodium refuses (a zero scalar, the identity point).
 *
 * Internally points and scalars are 32-byte binary strings; hex (lowercase) is
 * used at every boundary — database, JSON, API.
 */
final class Group
{
    public const PROTOCOL = 'evote-v1';

    public const IDENTITY = "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";

    public static function isZeroScalar(string $s): bool
    {
        return hash_equals(self::IDENTITY, $s);
    }

    public static function isIdentity(string $p): bool
    {
        return hash_equals(self::IDENTITY, $p);
    }

    /** k·G; zero maps to the identity (g^0 is a legitimate "no vote"). */
    public static function mulBase(string $k): string
    {
        return self::isZeroScalar($k) ? self::IDENTITY : sodium_crypto_scalarmult_ristretto255_base($k);
    }

    /** k·P, with the identity/zero cases libsodium rejects handled explicitly. */
    public static function mul(string $p, string $k): string
    {
        if (self::isZeroScalar($k) || self::isIdentity($p)) {
            return self::IDENTITY;
        }

        return sodium_crypto_scalarmult_ristretto255($k, $p);
    }

    public static function add(string $p, string $q): string
    {
        return sodium_crypto_core_ristretto255_add($p, $q);
    }

    public static function sub(string $p, string $q): string
    {
        return sodium_crypto_core_ristretto255_sub($p, $q);
    }

    public static function base(): string
    {
        return self::mulBase(self::intScalar(1));
    }

    /* ------------------------------------------------------------ scalars */

    public static function intScalar(int $n): string
    {
        if ($n < 0) {
            return sodium_crypto_core_ristretto255_scalar_negate(self::intScalar(-$n));
        }

        return str_pad(pack('P', $n), 32, "\0");
    }

    public static function sAdd(string $a, string $b): string
    {
        return sodium_crypto_core_ristretto255_scalar_add($a, $b);
    }

    public static function sSub(string $a, string $b): string
    {
        return sodium_crypto_core_ristretto255_scalar_sub($a, $b);
    }

    public static function sMul(string $a, string $b): string
    {
        return sodium_crypto_core_ristretto255_scalar_mul($a, $b);
    }

    public static function sInv(string $a): string
    {
        return sodium_crypto_core_ristretto255_scalar_invert($a);
    }

    public static function randomScalar(): string
    {
        do {
            $s = sodium_crypto_core_ristretto255_scalar_random();
        } while (self::isZeroScalar($s));

        return $s;
    }

    /* ----------------------------------------------------------- encoding */

    public static function pointFromHex(mixed $hex): string
    {
        if (!is_string($hex) || !preg_match('/^[0-9a-f]{64}$/', $hex)) {
            throw new InvalidArgumentException('invalid point encoding');
        }

        $bin = hex2bin($hex);

        if (!self::isIdentity($bin) && !sodium_crypto_core_ristretto255_is_valid_point($bin)) {
            throw new InvalidArgumentException('not a canonical ristretto255 point');
        }

        return $bin;
    }

    /** Rejects encodings ≥ L so every scalar has exactly one byte form. */
    public static function scalarFromHex(mixed $hex): string
    {
        if (!is_string($hex) || !preg_match('/^[0-9a-f]{64}$/', $hex)) {
            throw new InvalidArgumentException('invalid scalar encoding');
        }

        $bin = hex2bin($hex);

        if (!hash_equals($bin, sodium_crypto_core_ristretto255_scalar_reduce($bin . str_repeat("\0", 32)))) {
            throw new InvalidArgumentException('non-canonical scalar');
        }

        return $bin;
    }

    public static function hex(string $bin): string
    {
        return bin2hex($bin);
    }

    /** Length-prefixed transcript: 4-byte big-endian length before every item. */
    public static function transcript(string $domain, array $items): string
    {
        $out = '';

        foreach (array_merge([self::PROTOCOL . '|' . $domain], $items) as $item) {
            $item = (string) $item;
            $out .= pack('N', strlen($item)) . $item;
        }

        return $out;
    }

    /** Fiat–Shamir challenge: SHA-512(transcript) reduced mod L. */
    public static function hashToScalar(string $domain, array $items): string
    {
        return sodium_crypto_core_ristretto255_scalar_reduce(hash('sha512', self::transcript($domain, $items), true));
    }

    /** SHA-256(transcript) as hex — manifest hashes, tracking codes, contexts. */
    public static function hashItems(string $domain, array $items): string
    {
        return hash('sha256', self::transcript($domain, $items));
    }
}
