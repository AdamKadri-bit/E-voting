<?php

namespace App\Crypto;

use RuntimeException;
use Throwable;

/**
 * Threshold-key checks and tally decryption — twin of
 * frontend/src/crypto/threshold.ts. The server verifies what trustees submit
 * and combines their partial decryptions; it never holds a key share.
 */
final class Threshold
{
    public static function commCtx(int $electionId, int $i): string
    {
        return Group::hashItems('dkg-comm', [(string) $electionId, (string) $i]);
    }

    public static function coefCtx(int $electionId, int $i, int $m): string
    {
        return Group::hashItems('dkg-coef', [(string) $electionId, (string) $i, (string) $m]);
    }

    public static function pdecCtx(int $electionId, int $j, string $key): string
    {
        return Group::hashItems('pdec', [(string) $electionId, (string) $j, $key]);
    }

    /** Checks a trustee's round-1 publication: one Schnorr proof per commitment + the comm key. */
    public static function verifyRound1(int $electionId, int $threshold, array $r): bool
    {
        try {
            $i = (int) $r['trustee_index'];
            if (!is_array($r['commitments'] ?? null) || !is_array($r['commitment_proofs'] ?? null)
                || count($r['commitments']) !== $threshold || count($r['commitment_proofs']) !== $threshold) {
                return false;
            }
            if (!Proofs::schnorrVerify(self::commCtx($electionId, $i), Group::pointFromHex($r['comm_public_key']), $r['comm_proof'])) {
                return false;
            }
            foreach (array_values($r['commitments']) as $m => $c) {
                if (!Proofs::schnorrVerify(self::coefCtx($electionId, $i, $m), Group::pointFromHex($c), $r['commitment_proofs'][$m])) {
                    return false;
                }
            }

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /** Σ_m x^m·A_m. */
    public static function evalCommitments(array $commitmentsHex, int $x): string
    {
        $acc = Group::IDENTITY;
        $pow = Group::intScalar(1);
        foreach ($commitmentsHex as $A) {
            $acc = Group::add($acc, Group::mul(Group::pointFromHex($A), $pow));
            $pow = Group::sMul($pow, Group::intScalar($x));
        }

        return $acc;
    }

    /** @param array<int, array> $round1s */
    public static function jointPublicKey(array $round1s): string
    {
        $acc = Group::IDENTITY;
        foreach ($round1s as $r) {
            $acc = Group::add($acc, Group::pointFromHex($r['commitments'][0]));
        }

        return $acc;
    }

    /** S_j = s_j·G derived from public commitments alone. */
    public static function sharePublicKey(array $round1s, int $j): string
    {
        $acc = Group::IDENTITY;
        foreach ($round1s as $r) {
            $acc = Group::add($acc, self::evalCommitments($r['commitments'], $j));
        }

        return $acc;
    }

    public static function verifyPartial(int $electionId, int $j, string $S, array $agg, mixed $share): bool
    {
        try {
            return is_array($share)
                && ($share['key'] ?? null) === $agg['key']
                && Proofs::equalityVerify(
                    self::pdecCtx($electionId, $j, $agg['key']),
                    $S,
                    Group::pointFromHex($agg['a']),
                    Group::pointFromHex($share['m'] ?? null),
                    $share['proof'] ?? null
                );
        } catch (Throwable) {
            return false;
        }
    }

    public static function lagrange(array $indices, int $j): string
    {
        $num = Group::intScalar(1);
        $den = Group::intScalar(1);
        foreach ($indices as $m) {
            if ($m === $j) {
                continue;
            }
            $num = Group::sMul($num, Group::intScalar($m));
            $den = Group::sMul($den, Group::sSub(Group::intScalar($m), Group::intScalar($j)));
        }

        return Group::sMul($num, Group::sInv($den));
    }

    /** @param array<int,string> $partials trustee_index => M_j (binary) */
    public static function combine(string $bHex, array $partials): string
    {
        $indices = array_keys($partials);
        $sA = Group::IDENTITY;
        foreach ($partials as $j => $M) {
            $sA = Group::add($sA, Group::mul($M, self::lagrange($indices, $j)));
        }

        return Group::sub(Group::pointFromHex($bHex), $sA);
    }

    /**
     * Baby-step giant-step: finds m in [0, max] with m·G = target. The tally
     * is bounded by the ballot count, so max is small and this is quick.
     */
    public static function discreteLog(string $target, int $max): int
    {
        $s = (int) ceil(sqrt($max + 1));
        $baby = [];
        $acc = Group::IDENTITY;
        $G = Group::base();
        for ($j = 0; $j < $s; $j++) {
            $baby[bin2hex($acc)] = $j;
            $acc = Group::add($acc, $G);
        }
        $giant = Group::mulBase(Group::intScalar($s));
        $cur = $target;
        for ($i = 0; $i <= $s; $i++) {
            $hit = $baby[bin2hex($cur)] ?? null;
            if ($hit !== null && $i * $s + $hit <= $max) {
                return $i * $s + $hit;
            }
            $cur = Group::sub($cur, $giant);
        }

        throw new RuntimeException('Tally value outside the expected range — decryption shares are inconsistent.');
    }

    /* -------------- trustee-side operations: seeder and test harness only -- */

    public static function evalPoly(array $coefficients, int $x): string
    {
        $X = Group::intScalar($x);
        $acc = Group::intScalar(0);
        for ($m = count($coefficients) - 1; $m >= 0; $m--) {
            $acc = Group::sAdd(Group::sMul($acc, $X), $coefficients[$m]);
        }

        return $acc;
    }

    /** @return array{pub: array, coefficients: string[]} */
    public static function round1(int $electionId, int $index, int $threshold): array
    {
        $comm = Group::randomScalar();
        $C = Group::mulBase($comm);
        $coefficients = [];
        $commitments = [];
        $proofs = [];
        for ($m = 0; $m < $threshold; $m++) {
            $a = Group::randomScalar();
            $A = Group::mulBase($a);
            $coefficients[] = $a;
            $commitments[] = bin2hex($A);
            $proofs[] = Proofs::schnorrProve(self::coefCtx($electionId, $index, $m), $a, $A);
        }

        return [
            'pub' => [
                'trustee_index' => $index,
                'comm_public_key' => bin2hex($C),
                'comm_proof' => Proofs::schnorrProve(self::commCtx($electionId, $index), $comm, $C),
                'commitments' => $commitments,
                'commitment_proofs' => $proofs,
            ],
            'coefficients' => $coefficients,
        ];
    }

    public static function partialDecrypt(int $electionId, int $j, string $share, array $aggregates): array
    {
        $S = Group::mulBase($share);

        return array_map(function ($agg) use ($electionId, $j, $share, $S) {
            $A = Group::pointFromHex($agg['a']);
            $M = Group::mul($A, $share);

            return [
                'key' => $agg['key'],
                'm' => bin2hex($M),
                'proof' => Proofs::equalityProve(self::pdecCtx($electionId, $j, $agg['key']), $share, $S, $A, $M),
            ];
        }, $aggregates);
    }
}
