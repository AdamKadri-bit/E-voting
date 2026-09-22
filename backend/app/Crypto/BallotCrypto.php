<?php

namespace App\Crypto;

use Throwable;

/**
 * Manifest hashing, ballot verification and Benaloh audit checks — the PHP
 * twin of frontend/src/crypto/{manifest,ballot}.ts. verify() is the gate every
 * ballot passes before the server stores it; a ballot that claims "1000 votes"
 * or two lists at once cannot produce proofs that pass it.
 */
final class BallotCrypto
{
    /** @param array{election_id:int,constituency_id:int,district_id:?int,options:array,constraints:array} $m */
    public static function manifestHash(array $m): string
    {
        $items = [
            (string) $m['election_id'],
            (string) $m['constituency_id'],
            $m['district_id'] === null ? '' : (string) $m['district_id'],
            'options:' . count($m['options']),
        ];
        foreach ($m['options'] as $o) {
            array_push($items, $o['type'], (string) $o['id'], $o['list_id'] === null ? '' : (string) $o['list_id'], (string) $o['label']);
        }
        $items[] = 'constraints:' . count($m['constraints']);
        foreach ($m['constraints'] as $c) {
            array_push($items, $c['type'], (string) $c['value'], $c['parent'] === null ? '' : (string) $c['parent'], implode('.', $c['indices']));
        }

        return Group::hashItems('manifest', $items);
    }

    public static function proofContext(int $electionId, string $manifestHash, string $jointPkHex, string $credential): string
    {
        return Group::hashItems('ctx', [(string) $electionId, $manifestHash, $jointPkHex, $credential]);
    }

    /** @param array<int, array{a:string,b:string}> $cts hex ciphertexts */
    public static function trackingHash(int $electionId, string $manifestHash, array $cts): string
    {
        $items = [(string) $electionId, $manifestHash, (string) count($cts)];
        foreach ($cts as $c) {
            $items[] = $c['a'];
            $items[] = $c['b'];
        }

        return Group::hashItems('tracking', $items);
    }

    /** First 80 bits as Crockford base32, "XXXX-XXXX-XXXX-XXXX". */
    public static function shortCode(string $fullHex): string
    {
        $alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
        $bits = '';
        foreach (str_split(substr(hex2bin($fullHex), 0, 10)) as $byte) {
            $bits .= str_pad(decbin(ord($byte)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            $out .= $alphabet[bindec($chunk)];
        }

        return implode('-', str_split($out, 4));
    }

    private static function constraintCiphertext(array $c, array $cts): array
    {
        $sum = ElGamal::zero();
        foreach ($c['indices'] as $i) {
            $sum = ElGamal::add($sum, $cts[$i]);
        }

        return $c['type'] === 'implies' ? ElGamal::sub($cts[$c['parent']], $sum) : $sum;
    }

    private static function constraintMax(array $c): int
    {
        return $c['type'] === 'implies' ? 1 : (int) $c['value'];
    }

    public static function satisfies(array $manifest, array $v): bool
    {
        if (count($v) !== count($manifest['options'])) {
            return false;
        }
        foreach ($v as $x) {
            if ($x !== 0 && $x !== 1) {
                return false;
            }
        }
        foreach ($manifest['constraints'] as $c) {
            $s = 0;
            foreach ($c['indices'] as $i) {
                $s += $v[$i];
            }
            $val = $c['type'] === 'implies' ? $v[$c['parent']] - $s : $s;
            $ok = match ($c['type']) {
                'exact' => $val === (int) $c['value'],
                'max' => $val >= 0 && $val <= (int) $c['value'],
                default => $val === 0 || $val === 1,
            };
            if (!$ok) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{ok:bool, reason?:string}
     */
    public static function verify(array $manifest, string $jointPkHex, array $ballot): array
    {
        try {
            if (($ballot['manifest_hash'] ?? null) !== $manifest['hash'] || self::manifestHash($manifest) !== $manifest['hash']) {
                return ['ok' => false, 'reason' => 'manifest mismatch'];
            }
            if ((int) ($ballot['election_id'] ?? 0) !== (int) $manifest['election_id']) {
                return ['ok' => false, 'reason' => 'wrong election'];
            }
            $n = count($manifest['options']);
            if (!is_array($ballot['ciphertexts'] ?? null) || !is_array($ballot['option_proofs'] ?? null)
                || count($ballot['ciphertexts']) !== $n || count($ballot['option_proofs']) !== $n) {
                return ['ok' => false, 'reason' => 'wrong number of ciphertexts'];
            }
            if (!is_array($ballot['constraint_proofs'] ?? null) || count($ballot['constraint_proofs']) !== count($manifest['constraints'])) {
                return ['ok' => false, 'reason' => 'wrong number of constraint proofs'];
            }
            if (!is_string($ballot['credential'] ?? null)) {
                return ['ok' => false, 'reason' => 'missing credential'];
            }

            $H = Group::pointFromHex($jointPkHex);
            $ctx = self::proofContext((int) $ballot['election_id'], $manifest['hash'], $jointPkHex, $ballot['credential']);
            $cts = array_map([ElGamal::class, 'fromJson'], array_values($ballot['ciphertexts']));

            for ($i = 0; $i < $n; $i++) {
                if (!Proofs::rangeVerify($ctx, $H, $cts[$i], 1, $ballot['option_proofs'][$i])) {
                    return ['ok' => false, 'reason' => "option {$i} is not 0 or 1"];
                }
            }
            foreach (array_values($manifest['constraints']) as $k => $c) {
                $ct = self::constraintCiphertext($c, $cts);
                $p = $ballot['constraint_proofs'][$k];
                $ok = $c['type'] === 'exact'
                    ? Proofs::exactVerify($ctx, $H, $ct, (int) $c['value'], $p)
                    : Proofs::rangeVerify($ctx, $H, $ct, self::constraintMax($c), $p);
                if (!$ok) {
                    return ['ok' => false, 'reason' => "constraint {$k} ({$c['type']}) violated"];
                }
            }

            return ['ok' => true];
        } catch (Throwable $e) {
            return ['ok' => false, 'reason' => 'malformed ballot'];
        }
    }

    /** Benaloh audit: re-encrypting the claimed selection with the revealed randomness must reproduce the ciphertexts. */
    public static function verifyAudit(array $manifest, string $jointPkHex, array $audit): array
    {
        try {
            $n = count($manifest['options']);
            if (($audit['manifest_hash'] ?? null) !== $manifest['hash']) {
                return ['ok' => false, 'reason' => 'manifest mismatch'];
            }
            if (!is_array($audit['ciphertexts'] ?? null) || !is_array($audit['randomness'] ?? null) || !is_array($audit['selections'] ?? null)
                || count($audit['ciphertexts']) !== $n || count($audit['randomness']) !== $n) {
                return ['ok' => false, 'reason' => 'wrong length'];
            }
            $sel = array_map(fn ($x) => is_int($x) ? $x : -1, array_values($audit['selections']));
            if (!self::satisfies($manifest, $sel)) {
                return ['ok' => false, 'reason' => 'claimed selection breaks the ballot rules'];
            }
            $H = Group::pointFromHex($jointPkHex);
            for ($i = 0; $i < $n; $i++) {
                $re = ElGamal::toJson(ElGamal::encrypt($sel[$i], Group::scalarFromHex($audit['randomness'][$i]), $H));
                if ($re['a'] !== ($audit['ciphertexts'][$i]['a'] ?? null) || $re['b'] !== ($audit['ciphertexts'][$i]['b'] ?? null)) {
                    return ['ok' => false, 'reason' => "option {$i} does not encrypt the claimed choice"];
                }
            }

            return ['ok' => true];
        } catch (Throwable) {
            return ['ok' => false, 'reason' => 'malformed audit'];
        }
    }

    /**
     * Encrypts a selection vector — used by the seeder and tests only; real
     * ballots are always encrypted in the voter's browser.
     *
     * @return array{ballot: array, randomness: string[]}
     */
    public static function encrypt(array $manifest, string $jointPkHex, string $credential, array $selections): array
    {
        if (!self::satisfies($manifest, $selections)) {
            throw new \InvalidArgumentException('Selection breaks the ballot rules.');
        }
        $H = Group::pointFromHex($jointPkHex);
        $ctx = self::proofContext((int) $manifest['election_id'], $manifest['hash'], $jointPkHex, $credential);
        $rs = [];
        $cts = [];
        $optionProofs = [];
        foreach ($selections as $i => $m) {
            $r = Group::randomScalar();
            $ct = ElGamal::encrypt($m, $r, $H);
            $rs[] = $r;
            $cts[] = $ct;
            $optionProofs[] = Proofs::rangeProve($ctx, $H, $ct, $m, $r, 1);
        }
        $constraintProofs = [];
        foreach ($manifest['constraints'] as $c) {
            $ct = self::constraintCiphertext($c, $cts);
            $r = Group::intScalar(0);
            $v = 0;
            foreach ($c['indices'] as $i) {
                $r = Group::sAdd($r, $rs[$i]);
                $v += $selections[$i];
            }
            if ($c['type'] === 'implies') {
                $r = Group::sSub($rs[$c['parent']], $r);
                $v = $selections[$c['parent']] - $v;
            }
            $constraintProofs[] = $c['type'] === 'exact'
                ? Proofs::exactProve($ctx, $H, $ct, (int) $c['value'], $r)
                : Proofs::rangeProve($ctx, $H, $ct, $v, $r, self::constraintMax($c));
        }

        return [
            'ballot' => [
                'election_id' => (int) $manifest['election_id'],
                'manifest_id' => (int) $manifest['id'],
                'manifest_hash' => $manifest['hash'],
                'credential' => $credential,
                'ciphertexts' => array_map([ElGamal::class, 'toJson'], $cts),
                'option_proofs' => $optionProofs,
                'constraint_proofs' => $constraintProofs,
            ],
            'randomness' => array_map('bin2hex', $rs),
        ];
    }
}
