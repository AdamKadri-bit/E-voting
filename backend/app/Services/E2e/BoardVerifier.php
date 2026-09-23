<?php

namespace App\Services\E2e;

use App\Crypto\BallotCrypto;
use App\Crypto\ElGamal;
use App\Crypto\Group;
use App\Crypto\Threshold;
use Throwable;

/**
 * Server-side run of the same checks as frontend/src/crypto/verifier.ts, over
 * the same board export. Used for the admin report and `php artisan
 * election:verify`. It re-derives everything from the published data rather
 * than trusting the database, so a tampered row makes it fail. The TypeScript
 * verifier remains the independent one (different code, different library).
 */
class BoardVerifier
{
    private const MAX_LISTED = 20;

    public function verify(array $board): array
    {
        $checks = [];
        $e = $board['election'];
        $pk = $e['joint_public_key'];
        $trustees = array_values(array_filter($board['trustees'], fn ($t) => !empty($t['round1'])));
        $round1s = array_column($trustees, 'round1');

        // 1. keys
        $f = [];
        if (!$pk) {
            $f[] = 'election has no public key';
        }
        if (count($trustees) !== (int) $e['trustee_count']) {
            $f[] = "expected {$e['trustee_count']} trustees, found " . count($trustees);
        }
        foreach ($trustees as $t) {
            if (!Threshold::verifyRound1((int) $e['id'], (int) $e['threshold'], $t['round1'])) {
                $f[] = "trustee {$t['trustee_index']}: commitment proofs invalid";
            }
        }
        if ($pk && $round1s && bin2hex(Threshold::jointPublicKey($round1s)) !== $pk) {
            $f[] = 'joint key ≠ Σ trustee commitments';
        }
        $checks[] = $this->check('keys', "Election key derives from the trustees' public shares", $f, count($trustees) . " trustees, threshold {$e['threshold']}");

        // 2. manifests
        $f = [];
        $manifests = [];
        foreach ($board['manifests'] as $m) {
            if (BallotCrypto::manifestHash($m) !== $m['hash']) {
                $f[] = "manifest {$m['id']}: hash mismatch";
            }
            $manifests[$m['id']] = $m;
        }
        $checks[] = $this->check('manifests', 'Ballot styles are the published ones', $f, count($manifests) . ' ballot styles');

        // 3. ballots
        $f = [];
        $seen = [];
        foreach ($board['ballots'] as $row) {
            $m = $manifests[$row['ballot']['manifest_id']] ?? null;
            if (!$m || !$pk) {
                $f[] = "{$row['short_code']}: unknown ballot style";
                continue;
            }
            if (BallotCrypto::trackingHash((int) $e['id'], $m['hash'], $row['ballot']['ciphertexts']) !== $row['tracking_code']) {
                $f[] = "{$row['short_code']}: tracking code mismatch";
            }
            if (isset($seen[$row['tracking_code']])) {
                $f[] = "{$row['short_code']}: duplicate ballot";
            }
            $seen[$row['tracking_code']] = true;
            $r = BallotCrypto::verify($m, $pk, $row['ballot']);
            if (!$r['ok']) {
                $f[] = "{$row['short_code']}: {$r['reason']}";
            }
        }
        $checks[] = $this->check('ballots', 'Every ballot proves it is a valid vote', $f, count($board['ballots']) . ' ballots checked');

        // 4. re-votes
        $f = [];
        $latest = [];
        foreach ($board['ballots'] as $row) {
            $c = $row['ballot']['credential'];
            if (!isset($latest[$c]) || $row['sequence'] > $latest[$c]['sequence']) {
                $latest[$c] = $row;
            }
        }
        $latestCodes = array_flip(array_map(fn ($r) => $r['tracking_code'], $latest));
        foreach ($board['ballots'] as $row) {
            $should = isset($latestCodes[$row['tracking_code']]) ? 'counted' : 'superseded';
            if ($row['status'] !== $should) {
                $f[] = "{$row['short_code']}: marked {$row['status']}, should be {$should}";
            }
        }
        $checks[] = $this->check('revotes', "Only each voter's last ballot is counted", $f, count($latest) . ' voters');

        // 5. audits
        $f = [];
        foreach ($board['audited_ballots'] as $a) {
            $m = $manifests[$a['audit']['manifest_id']] ?? null;
            if (!$m || !$pk) {
                $f[] = "{$a['short_code']}: unknown ballot style";
                continue;
            }
            $r = BallotCrypto::verifyAudit($m, $pk, $a['audit']);
            if (!$r['ok']) {
                $f[] = "{$a['short_code']}: {$r['reason']}";
            }
        }
        $checks[] = $this->check('audits', 'Audited ballots encrypt exactly what the voter saw', $f, count($board['audited_ballots']) . ' audited ballots');

        // 6–8. tally
        $t = $board['tally'];
        if (!$t) {
            foreach ([['aggregate', 'Tally is the sum of the counted ballots'], ['decryption', 'Trustee decryptions are proven correct'], ['results', 'Published results are consistent']] as [$id, $name]) {
                $checks[] = $this->check($id, $name, [], 'Tally not published yet', true);
            }
        } else {
            $expected = [];
            $counts = [];
            foreach ($latest as $row) {
                $m = $manifests[$row['ballot']['manifest_id']] ?? null;
                if (!$m) {
                    continue;
                }
                $counts[$m['constituency_id']] = ($counts[$m['constituency_id']] ?? 0) + 1;
                foreach ($m['options'] as $i => $o) {
                    $k = TallyService::key($m['constituency_id'], $o['type'], $o['id']);
                    $expected[$k] = ElGamal::add($expected[$k] ?? ElGamal::zero(), ElGamal::fromJson($row['ballot']['ciphertexts'][$i]));
                }
            }

            $f = [];
            $published = collect($t['aggregates'])->keyBy('key');
            foreach ($expected as $k => $ct) {
                $p = $published[$k] ?? null;
                if (!$p || ElGamal::toJson($ct) !== ['a' => $p['a'], 'b' => $p['b']]) {
                    $f[] = "{$k}: aggregate does not match counted ballots";
                }
            }
            foreach ($published as $k => $p) {
                if (!isset($expected[$k]) && ($p['a'] !== str_repeat('0', 64) || $p['b'] !== str_repeat('0', 64))) {
                    $f[] = "{$k}: aggregate for an option no counted ballot carries";
                }
            }
            $bc = (array) $t['ballot_counts'];
            foreach ($counts as $cid => $n) {
                if ((int) ($bc[$cid] ?? -1) !== $n) {
                    $f[] = "constituency {$cid}: ballot count mismatch";
                }
            }
            $checks[] = $this->check('aggregate', 'Tally is the sum of the counted ballots', $f, count($expected) . ' option totals');

            $f = [];
            $results = collect($t['results'])->pluck('count', 'key');
            if (count($t['used_trustees']) < (int) $e['threshold']) {
                $f[] = 'fewer trustees than the threshold';
            }
            $shareKeys = [];
            foreach ($trustees as $tr) {
                $shareKeys[$tr['trustee_index']] = Threshold::sharePublicKey($round1s, $tr['trustee_index']);
            }
            $partials = collect($t['partials'])->keyBy('trustee_index');
            foreach ($t['aggregates'] as $agg) {
                $parts = [];
                foreach ($t['used_trustees'] as $j) {
                    $share = collect($partials[$j]['shares'] ?? [])->firstWhere('key', $agg['key']);
                    if (!isset($shareKeys[$j]) || !Threshold::verifyPartial((int) $e['id'], $j, $shareKeys[$j], $agg, $share)) {
                        $f[] = "{$agg['key']}: trustee {$j}'s decryption proof fails";
                        continue;
                    }
                    $parts[$j] = Group::pointFromHex($share['m']);
                }
                if (count($parts) !== count($t['used_trustees'])) {
                    continue;
                }
                try {
                    $mG = Threshold::combine($agg['b'], $parts);
                    $claimed = $results[$agg['key']] ?? null;
                    if ($claimed === null || !hash_equals(Group::mulBase(Group::intScalar((int) $claimed)), $mG)) {
                        $f[] = "{$agg['key']}: decryption does not equal published count";
                    }
                } catch (Throwable) {
                    $f[] = "{$agg['key']}: could not combine";
                }
            }
            $checks[] = $this->check('decryption', 'Trustee decryptions are proven correct and combine to the results', $f, count($t['aggregates']) . ' totals');

            $f = [];
            foreach ($counts as $cid => $n) {
                $lists = $results->filter(fn ($v, $k) => str_starts_with($k, "c{$cid}/list:"))->sum();
                if ($lists !== $n) {
                    $f[] = "constituency {$cid}: list votes {$lists} ≠ ballots {$n}";
                }
            }
            $checks[] = $this->check('results', 'Published results are consistent (one list per ballot)', $f, $results->count() . ' published counts');
        }

        return [
            'ok' => collect($checks)->every(fn ($c) => $c['ok']),
            'election_id' => $e['id'],
            'generated_at' => now()->toISOString(),
            'checks' => $checks,
        ];
    }

    private function check(string $id, string $name, array $failures, string $detail, bool $skipped = false): array
    {
        return [
            'id' => $id, 'name' => $name, 'ok' => $skipped || $failures === [], 'skipped' => $skipped,
            'detail' => $detail, 'failures' => array_slice($failures, 0, self::MAX_LISTED),
        ];
    }
}
