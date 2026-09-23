<?php

namespace Tests\Unit\Crypto;

use App\Crypto\BallotCrypto;
use App\Crypto\ElGamal;
use App\Crypto\Group;
use App\Crypto\Keyfile;
use App\Crypto\Proofs;
use App\Crypto\Threshold;
use PHPUnit\Framework\TestCase;

/**
 * The browser (@noble, TypeScript) and the server (libsodium, PHP) must agree
 * byte-for-byte. Every vector here was produced by the TypeScript code —
 * regenerate with `npx tsx scripts/gen-crypto-vectors.ts` in frontend/.
 */
class CrossImplementationTest extends TestCase
{
    private static array $v;

    public static function setUpBeforeClass(): void
    {
        self::$v = json_decode(file_get_contents(__DIR__ . '/../../Fixtures/crypto-vectors.json'), true);
    }

    public function test_rfc9496_generator_multiples(): void
    {
        $this->assertSame('e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76', bin2hex(Group::base()));
        foreach (self::$v['base_multiples'] as $row) {
            $this->assertSame($row['p'], bin2hex(Group::mulBase(Group::scalarFromHex($row['k']))));
        }
    }

    public function test_fiat_shamir_hash_matches_typescript(): void
    {
        foreach (self::$v['hash_to_scalar'] as $row) {
            $this->assertSame($row['out'], bin2hex(Group::hashToScalar($row['domain'], $row['items'])));
        }
    }

    public function test_non_canonical_encodings_are_rejected(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Group::scalarFromHex(str_repeat('ff', 32));
    }

    public function test_manifest_hash_matches(): void
    {
        $m = self::$v['manifest'];
        $this->assertSame($m['hash'], BallotCrypto::manifestHash($m));
    }

    public function test_ceremony_proofs_and_derived_keys_match(): void
    {
        $r1 = self::$v['ceremony']['round1'];
        foreach ($r1 as $r) {
            $this->assertTrue(Threshold::verifyRound1(7, 2, $r), "trustee {$r['trustee_index']}");
        }
        $this->assertSame(self::$v['ceremony']['joint_public_key'], bin2hex(Threshold::jointPublicKey($r1)));
        foreach (self::$v['ceremony']['share_public_keys'] as $row) {
            $this->assertSame($row['key'], bin2hex(Threshold::sharePublicKey($r1, $row['index'])));
        }

        $bad = $r1[0];
        $bad['commitments'][1] = $r1[1]['commitments'][1];
        $this->assertFalse(Threshold::verifyRound1(7, 2, $bad));
    }

    public function test_browser_ballot_is_accepted_and_tracking_code_matches(): void
    {
        $m = self::$v['manifest'];
        $pk = self::$v['ceremony']['joint_public_key'];
        $valid = self::$v['ballots']['valid'];

        $this->assertSame(['ok' => true], BallotCrypto::verify($m, $pk, $valid['ballot']));
        $this->assertSame($valid['tracking']['full'], BallotCrypto::trackingHash(7, $m['hash'], $valid['ballot']['ciphertexts']));
        $this->assertSame($valid['tracking']['short'], BallotCrypto::shortCode($valid['tracking']['full']));
    }

    public function test_invalid_ballots_are_rejected(): void
    {
        $m = self::$v['manifest'];
        $pk = self::$v['ceremony']['joint_public_key'];
        foreach (['over_vote', 'two_lists', 'replayed_credential'] as $case) {
            $this->assertFalse(BallotCrypto::verify($m, $pk, self::$v['ballots'][$case])['ok'], $case);
        }
    }

    public function test_benaloh_audit_matches(): void
    {
        $m = self::$v['manifest'];
        $pk = self::$v['ceremony']['joint_public_key'];
        $this->assertTrue(BallotCrypto::verifyAudit($m, $pk, self::$v['audits']['honest'])['ok']);
        $this->assertFalse(BallotCrypto::verifyAudit($m, $pk, self::$v['audits']['corrupted'])['ok']);
    }

    public function test_tally_aggregation_and_threshold_decryption_match(): void
    {
        $board = self::$v['board'];
        $m = self::$v['manifest'];
        $round1 = self::$v['ceremony']['round1'];

        // Recompute aggregates from counted ballots.
        $expected = [];
        foreach ($board['ballots'] as $row) {
            if ($row['status'] !== 'counted') {
                continue;
            }
            foreach ($m['options'] as $i => $o) {
                $key = "c{$m['constituency_id']}/{$o['type']}:{$o['id']}";
                $expected[$key] = ElGamal::add($expected[$key] ?? ElGamal::zero(), ElGamal::fromJson($row['ballot']['ciphertexts'][$i]));
            }
        }

        $results = array_column($board['tally']['results'], 'count', 'key');
        $counted = count(array_filter($board['ballots'], fn ($b) => $b['status'] === 'counted'));

        foreach ($board['tally']['aggregates'] as $agg) {
            $this->assertSame(ElGamal::toJson($expected[$agg['key']]), ['a' => $agg['a'], 'b' => $agg['b']]);

            $partials = [];
            foreach ($board['tally']['partials'] as $p) {
                $j = $p['trustee_index'];
                $share = collect($p['shares'])->firstWhere('key', $agg['key']);
                $this->assertTrue(Threshold::verifyPartial(7, $j, Threshold::sharePublicKey($round1, $j), $agg, $share));
                $partials[$j] = Group::pointFromHex($share['m']);
            }
            $mG = Threshold::combine($agg['b'], $partials);
            $this->assertSame($results[$agg['key']], Threshold::discreteLog($mG, $counted));
        }
    }

    public function test_php_and_typescript_proofs_interoperate(): void
    {
        // PHP proves; the same verify path the TS tests use must accept it.
        $sk = Group::randomScalar();
        $H = Group::mulBase($sk);
        $r = Group::randomScalar();
        $ct = ElGamal::encrypt(1, $r, $H);
        $p = Proofs::rangeProve('c', $H, $ct, 1, $r, 1);
        $this->assertTrue(Proofs::rangeVerify('c', $H, $ct, 1, $p));
        $this->assertFalse(Proofs::rangeVerify('d', $H, $ct, 1, $p));

        $m = self::$v['manifest'];
        $pk = self::$v['ceremony']['joint_public_key'];
        $php = BallotCrypto::encrypt($m, $pk, 'cred-php', [0, 1, 0, 0, 1]);
        $this->assertTrue(BallotCrypto::verify($m, $pk, $php['ballot'])['ok']);
    }

    public function test_keyfile_format_is_shared(): void
    {
        $kf = self::$v['keyfile'];
        $this->assertSame($kf['plaintext'], $this->openKeyfile($kf['file'], $kf['passphrase']));

        $php = Keyfile::seal(9, 1, 'share', ['share' => 'ab'], 'another passphrase', 1, 256);
        $this->assertSame(['share' => 'ab'], $this->openKeyfile($php, 'another passphrase'));
    }

    private function openKeyfile(array $f, string $pass): array
    {
        $key = sodium_crypto_pwhash(32, $pass, hex2bin($f['kdf']['salt']), $f['kdf']['t'], $f['kdf']['m'] * 1024, SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13);
        $m = $f['meta'];
        $aad = implode('|', [$m['format'], $m['kind'], $m['election_id'], $m['trustee_index'], $m['created_at']]);
        $raw = hex2bin($f['ciphertext']);
        $pt = openssl_decrypt(substr($raw, 0, -16), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, hex2bin($f['cipher']['nonce']), substr($raw, -16), $aad);
        $this->assertNotFalse($pt);

        return json_decode($pt, true);
    }
}
