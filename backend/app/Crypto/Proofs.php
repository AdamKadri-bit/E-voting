<?php

namespace App\Crypto;

use Throwable;

/**
 * Zero-knowledge proofs — twin of frontend/src/crypto/proofs.ts. Verification
 * is what the server relies on to accept ballots and trustee submissions; the
 * prove* methods exist for seeding and the test harness.
 */
final class Proofs
{
    /* ------------------------------------------------------------ Schnorr */

    public static function schnorrProve(string $ctx, string $x, string $X): array
    {
        $k = Group::randomScalar();
        $R = Group::mulBase($k);
        $c = Group::hashToScalar('schnorr', [$ctx, bin2hex($X), bin2hex($R)]);

        return ['r' => bin2hex($R), 'z' => bin2hex(Group::sAdd($k, Group::sMul($c, $x)))];
    }

    public static function schnorrVerify(string $ctx, string $X, mixed $proof): bool
    {
        try {
            $R = Group::pointFromHex($proof['r'] ?? null);
            $z = Group::scalarFromHex($proof['z'] ?? null);
            $c = Group::hashToScalar('schnorr', [$ctx, bin2hex($X), bin2hex($R)]);

            return hash_equals(Group::mulBase($z), Group::add($R, Group::mul($X, $c)));
        } catch (Throwable) {
            return false;
        }
    }

    /* -------------------------------------------------------- Range 0..max */

    public static function rangeProve(string $ctx, string $H, array $ct, int $value, string $r, int $max): array
    {
        $cs = [];
        $zs = [];
        $TA = [];
        $TB = [];
        $k = Group::randomScalar();

        for ($j = 0; $j <= $max; $j++) {
            if ($j === $value) {
                $TA[$j] = Group::mulBase($k);
                $TB[$j] = Group::mul($H, $k);
                continue;
            }
            $cs[$j] = Group::randomScalar();
            $zs[$j] = Group::randomScalar();
            $Bj = Group::sub($ct['b'], Group::mulBase(Group::intScalar($j)));
            $TA[$j] = Group::sub(Group::mulBase($zs[$j]), Group::mul($ct['a'], $cs[$j]));
            $TB[$j] = Group::sub(Group::mul($H, $zs[$j]), Group::mul($Bj, $cs[$j]));
        }

        $c = Group::hashToScalar('range', self::rangeTranscript($ctx, $H, $ct, $max, $TA, $TB));
        $others = Group::intScalar(0);
        for ($j = 0; $j <= $max; $j++) {
            if ($j !== $value) {
                $others = Group::sAdd($others, $cs[$j]);
            }
        }
        $cs[$value] = Group::sSub($c, $others);
        $zs[$value] = Group::sAdd($k, Group::sMul($cs[$value], $r));
        ksort($cs);
        ksort($zs);

        return ['c' => array_map('bin2hex', array_values($cs)), 'z' => array_map('bin2hex', array_values($zs))];
    }

    public static function rangeVerify(string $ctx, string $H, array $ct, int $max, mixed $proof): bool
    {
        try {
            if (!is_array($proof['c'] ?? null) || !is_array($proof['z'] ?? null)
                || count($proof['c']) !== $max + 1 || count($proof['z']) !== $max + 1) {
                return false;
            }

            $TA = [];
            $TB = [];
            $total = Group::intScalar(0);

            for ($j = 0; $j <= $max; $j++) {
                $cj = Group::scalarFromHex($proof['c'][$j]);
                $zj = Group::scalarFromHex($proof['z'][$j]);
                $Bj = Group::sub($ct['b'], Group::mulBase(Group::intScalar($j)));
                $TA[$j] = Group::sub(Group::mulBase($zj), Group::mul($ct['a'], $cj));
                $TB[$j] = Group::sub(Group::mul($H, $zj), Group::mul($Bj, $cj));
                $total = Group::sAdd($total, $cj);
            }

            return hash_equals(Group::hashToScalar('range', self::rangeTranscript($ctx, $H, $ct, $max, $TA, $TB)), $total);
        } catch (Throwable) {
            return false;
        }
    }

    private static function rangeTranscript(string $ctx, string $H, array $ct, int $max, array $TA, array $TB): array
    {
        $items = [$ctx, bin2hex($H), bin2hex($ct['a']), bin2hex($ct['b']), (string) $max];
        for ($j = 0; $j <= $max; $j++) {
            $items[] = bin2hex($TA[$j]);
            $items[] = bin2hex($TB[$j]);
        }

        return $items;
    }

    /* --------------------------------------------------------- Exact value */

    public static function exactProve(string $ctx, string $H, array $ct, int $value, string $r): array
    {
        $k = Group::randomScalar();
        $T1 = Group::mulBase($k);
        $T2 = Group::mul($H, $k);
        $c = Group::hashToScalar('exact', [$ctx, bin2hex($H), bin2hex($ct['a']), bin2hex($ct['b']), (string) $value, bin2hex($T1), bin2hex($T2)]);

        return ['c' => bin2hex($c), 'z' => bin2hex(Group::sAdd($k, Group::sMul($c, $r)))];
    }

    public static function exactVerify(string $ctx, string $H, array $ct, int $value, mixed $proof): bool
    {
        try {
            $c = Group::scalarFromHex($proof['c'] ?? null);
            $z = Group::scalarFromHex($proof['z'] ?? null);
            $Bk = Group::sub($ct['b'], Group::mulBase(Group::intScalar($value)));
            $T1 = Group::sub(Group::mulBase($z), Group::mul($ct['a'], $c));
            $T2 = Group::sub(Group::mul($H, $z), Group::mul($Bk, $c));

            return hash_equals(
                Group::hashToScalar('exact', [$ctx, bin2hex($H), bin2hex($ct['a']), bin2hex($ct['b']), (string) $value, bin2hex($T1), bin2hex($T2)]),
                $c
            );
        } catch (Throwable) {
            return false;
        }
    }

    /* ----------------------------------------------- Equal discrete logs */

    public static function equalityProve(string $ctx, string $x, string $X, string $A, string $M): array
    {
        $k = Group::randomScalar();
        $T1 = Group::mulBase($k);
        $T2 = Group::mul($A, $k);
        $c = Group::hashToScalar('equality', [$ctx, bin2hex($X), bin2hex($A), bin2hex($M), bin2hex($T1), bin2hex($T2)]);

        return ['c' => bin2hex($c), 'z' => bin2hex(Group::sAdd($k, Group::sMul($c, $x)))];
    }

    public static function equalityVerify(string $ctx, string $X, string $A, string $M, mixed $proof): bool
    {
        try {
            $c = Group::scalarFromHex($proof['c'] ?? null);
            $z = Group::scalarFromHex($proof['z'] ?? null);
            $T1 = Group::sub(Group::mulBase($z), Group::mul($X, $c));
            $T2 = Group::sub(Group::mul($A, $z), Group::mul($M, $c));

            return hash_equals(
                Group::hashToScalar('equality', [$ctx, bin2hex($X), bin2hex($A), bin2hex($M), bin2hex($T1), bin2hex($T2)]),
                $c
            );
        } catch (Throwable) {
            return false;
        }
    }
}
