/**
 * Independent election verifier. Runs identically in the browser (/verify),
 * in Node (scripts/verify-election.ts) and in the test suite. It trusts nothing
 * the server computed: it re-derives the election key, re-checks every proof,
 * re-adds every counted ballot and re-combines the trustees' decryptions.
 */
import { IDENTITY, type Point, pointFromHex, pointToHex } from "./group";
import { add, fromJson, toJson, zero, type CiphertextPoints } from "./elgamal";
import { trackingHash, verifyAudit, verifyBallot } from "./ballot";
import { manifestHash, type Manifest } from "./manifest";
import { combine, countMatches, jointPublicKey, sharePublicKey, verifyPartial, verifyRound1 } from "./threshold";
import { type BoardExport, tallyKey } from "./board";

export type CheckResult = { id: string; name: string; ok: boolean; skipped?: boolean; detail: string; failures: string[] };
export type VerifierReport = { ok: boolean; election_id: number; generated_at: string; checks: CheckResult[] };

const MAX_LISTED = 20;

function check(id: string, name: string, failures: string[], detail: string, skipped = false): CheckResult {
  return { id, name, ok: skipped || failures.length === 0, skipped, detail, failures: failures.slice(0, MAX_LISTED) };
}

export function verifyBoard(board: BoardExport, onProgress?: (stage: string, done: number, total: number) => void): VerifierReport {
  const checks: CheckResult[] = [];
  const e = board.election;
  const pk = e.joint_public_key;

  /* 1. Key ceremony --------------------------------------------------- */
  {
    const f: string[] = [];
    const complete = board.trustees.filter((t) => t.round1);
    if (!pk) f.push("election has no public key");
    if (complete.length !== e.trustee_count) f.push(`expected ${e.trustee_count} trustees, found ${complete.length}`);
    if (e.threshold < 1 || e.threshold > e.trustee_count) f.push("invalid threshold");
    for (const t of complete) {
      if (!verifyRound1(e.id, e.threshold, t.round1!)) f.push(`trustee ${t.trustee_index}: commitment proofs invalid`);
    }
    if (pk && complete.length) {
      if (pointToHex(jointPublicKey(complete.map((t) => t.round1!))) !== pk) f.push("joint key ≠ Σ trustee commitments");
      for (const t of complete) {
        const derived = pointToHex(sharePublicKey(complete.map((x) => x.round1!), t.trustee_index));
        if (t.share_public_key && t.share_public_key !== derived) f.push(`trustee ${t.trustee_index}: share key mismatch`);
      }
    }
    checks.push(check("keys", "Election key derives from the trustees' public shares", f, `${complete.length} trustees, threshold ${e.threshold}`));
  }

  /* 2. Manifests ------------------------------------------------------ */
  const manifests = new Map<number, Manifest>();
  {
    const f: string[] = [];
    for (const m of board.manifests) {
      if (manifestHash(m) !== m.hash) f.push(`manifest ${m.id}: hash mismatch`);
      if (m.election_id !== e.id) f.push(`manifest ${m.id}: wrong election`);
      manifests.set(m.id, m);
    }
    checks.push(check("manifests", "Ballot styles are the published ones", f, `${board.manifests.length} ballot styles`));
  }

  /* 3. Every ballot's validity proofs ---------------------------------- */
  {
    const f: string[] = [];
    const seen = new Set<string>();
    board.ballots.forEach((row, i) => {
      onProgress?.("ballots", i + 1, board.ballots.length);
      const m = manifests.get(row.ballot.manifest_id);
      if (!m || !pk) {
        f.push(`${row.short_code}: unknown ballot style`);
        return;
      }
      if (trackingHash(e.id, m.hash, row.ballot.ciphertexts) !== row.tracking_code) f.push(`${row.short_code}: tracking code mismatch`);
      if (seen.has(row.tracking_code)) f.push(`${row.short_code}: duplicate ballot`);
      seen.add(row.tracking_code);
      const r = verifyBallot(m, pk, row.ballot);
      if (!r.ok) f.push(`${row.short_code}: ${r.reason}`);
    });
    checks.push(check("ballots", "Every ballot proves it is a valid vote (0/1 per option, ballot rules)", f, `${board.ballots.length} ballots checked`));
  }

  /* 4. Only the latest ballot per credential counts -------------------- */
  const counted = new Map<string, (typeof board.ballots)[number]>();
  {
    const f: string[] = [];
    for (const row of board.ballots) {
      const prev = counted.get(row.ballot.credential);
      if (!prev || row.sequence > prev.sequence) counted.set(row.ballot.credential, row);
    }
    const latest = new Set([...counted.values()].map((r) => r.tracking_code));
    for (const row of board.ballots) {
      const should = latest.has(row.tracking_code) ? "counted" : "superseded";
      if (row.status !== should) f.push(`${row.short_code}: marked ${row.status}, should be ${should}`);
    }
    checks.push(check("revotes", "Only each voter's last ballot is counted", f, `${counted.size} voters, ${board.ballots.length - counted.size} superseded`));
  }

  /* 5. Audited (spoiled) ballots ---------------------------------------- */
  {
    const f: string[] = [];
    for (const a of board.audited_ballots) {
      const m = manifests.get(a.audit.manifest_id);
      if (!m || !pk) {
        f.push(`${a.short_code}: unknown ballot style`);
        continue;
      }
      if (trackingHash(e.id, m.hash, a.audit.ciphertexts) !== a.tracking_code) f.push(`${a.short_code}: tracking code mismatch`);
      const r = verifyAudit(m, pk, a.audit);
      if (!r.ok) f.push(`${a.short_code}: ${r.reason}`);
    }
    checks.push(check("audits", "Audited ballots encrypt exactly what the voter saw", f, `${board.audited_ballots.length} audited ballots`));
  }

  /* 6–8. Tally ------------------------------------------------------------ */
  const t = board.tally;
  if (!t) {
    const note = "Tally not published yet";
    checks.push(check("aggregate", "Tally is the sum of the counted ballots", [], note, true));
    checks.push(check("decryption", "Trustee decryptions are proven correct", [], note, true));
    checks.push(check("results", "Published results match the decrypted tally", [], note, true));
  } else {
    const expected = new Map<string, CiphertextPoints>();
    const counts = new Map<number, number>();
    for (const row of counted.values()) {
      const m = manifests.get(row.ballot.manifest_id);
      if (!m) continue;
      counts.set(m.constituency_id, (counts.get(m.constituency_id) ?? 0) + 1);
      m.options.forEach((o, i) => {
        const k = tallyKey(m.constituency_id, o.type, o.id);
        expected.set(k, add(expected.get(k) ?? zero(), fromJson(row.ballot.ciphertexts[i])));
      });
    }

    {
      const f: string[] = [];
      const published = new Map(t.aggregates.map((a) => [a.key, a]));
      for (const [k, ct] of expected) {
        const p = published.get(k);
        const j = toJson(ct);
        if (!p) f.push(`${k}: missing from tally`);
        else if (p.a !== j.a || p.b !== j.b) f.push(`${k}: aggregate does not match counted ballots`);
      }
      for (const k of published.keys()) {
        const p = published.get(k)!;
        const isZero = p.a === pointToHex(IDENTITY) && p.b === pointToHex(IDENTITY);
        if (!expected.has(k) && !isZero) f.push(`${k}: aggregate for an option no counted ballot carries`);
      }
      for (const [cid, n] of counts) {
        if ((t.ballot_counts[String(cid)] ?? -1) !== n) f.push(`constituency ${cid}: ballot count ${t.ballot_counts[String(cid)]} ≠ ${n}`);
      }
      checks.push(check("aggregate", "Tally is the sum of the counted ballots", f, `${expected.size} options across ${counts.size} constituencies`));
    }

    const results = new Map(t.results.map((r) => [r.key, r.count]));
    {
      const f: string[] = [];
      if (t.used_trustees.length < e.threshold) f.push(`only ${t.used_trustees.length} trustees used, threshold is ${e.threshold}`);
      const shareKeys = new Map<number, Point>();
      for (const tr of board.trustees) if (tr.round1) shareKeys.set(tr.trustee_index, sharePublicKey(board.trustees.filter((x) => x.round1).map((x) => x.round1!), tr.trustee_index));

      t.aggregates.forEach((agg, i) => {
        onProgress?.("decryption", i + 1, t.aggregates.length);
        const parts = new Map<number, Point>();
        for (const j of t.used_trustees) {
          const S = shareKeys.get(j);
          const p = t.partials.find((x) => x.trustee_index === j)?.shares.find((s) => s.key === agg.key);
          if (!S || !p) {
            f.push(`${agg.key}: trustee ${j} gave no partial decryption`);
            continue;
          }
          if (!verifyPartial(e.id, j, S, agg, p)) {
            f.push(`${agg.key}: trustee ${j}'s decryption proof fails`);
            continue;
          }
          parts.set(j, pointFromHex(p.m));
        }
        if (parts.size !== t.used_trustees.length) return;
        const claimed = results.get(agg.key);
        if (claimed === undefined) f.push(`${agg.key}: no published count`);
        else if (!countMatches(combine(agg, parts), claimed)) f.push(`${agg.key}: decryption does not equal published count ${claimed}`);
      });
      checks.push(check("decryption", "Trustee decryptions are proven correct and combine to the results", f, `${t.aggregates.length} totals, trustees ${t.used_trustees.join(", ")}`));
    }

    {
      const f: string[] = [];
      for (const [k, n] of results) if (!Number.isInteger(n) || n < 0) f.push(`${k}: impossible count ${n}`);
      for (const [cid, n] of counts) {
        let lists = 0;
        for (const [k, v] of results) if (k.startsWith(`c${cid}/list:`)) lists += v;
        if (lists !== n) f.push(`constituency ${cid}: list votes ${lists} ≠ ballots ${n}`);
      }
      checks.push(check("results", "Published results are consistent (one list per ballot)", f, `${results.size} published counts`));
    }
  }

  return { ok: checks.every((c) => c.ok), election_id: e.id, generated_at: new Date().toISOString(), checks };
}
