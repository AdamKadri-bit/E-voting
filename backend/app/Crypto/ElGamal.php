<?php

namespace App\Crypto;

/**
 * Exponential ElGamal: Enc(m; r) = (r·G, m·G + r·H). Ciphertexts are
 * ['a' => point, 'b' => point] in binary; adding them adds the plaintexts.
 */
final class ElGamal
{
    public static function encrypt(int $m, string $r, string $H): array
    {
        return [
            'a' => Group::mulBase($r),
            'b' => Group::add(Group::mulBase(Group::intScalar($m)), Group::mul($H, $r)),
        ];
    }

    public static function zero(): array
    {
        return ['a' => Group::IDENTITY, 'b' => Group::IDENTITY];
    }

    public static function add(array $x, array $y): array
    {
        return ['a' => Group::add($x['a'], $y['a']), 'b' => Group::add($x['b'], $y['b'])];
    }

    public static function sub(array $x, array $y): array
    {
        return ['a' => Group::sub($x['a'], $y['a']), 'b' => Group::sub($x['b'], $y['b'])];
    }

    public static function fromJson(mixed $c): array
    {
        if (!is_array($c)) {
            throw new \InvalidArgumentException('ciphertext must be an object');
        }

        return ['a' => Group::pointFromHex($c['a'] ?? null), 'b' => Group::pointFromHex($c['b'] ?? null)];
    }

    public static function toJson(array $c): array
    {
        return ['a' => bin2hex($c['a']), 'b' => bin2hex($c['b'])];
    }
}
