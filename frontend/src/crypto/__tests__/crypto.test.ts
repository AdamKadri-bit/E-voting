import { describe, expect, it } from "vitest";
import { G, IDENTITY, intScalar, mulBase, pointFromHex, pointToHex, randomScalar, hashToScalar, scalarToHex } from "../group";
import { encrypt, toJson, fromJson } from "../elgamal";
import { rangeProve, rangeVerify, exactProve, exactVerify, schnorrProve, schnorrVerify } from "../proofs";
import { encryptBallot, verifyBallot, verifyAudit, toAudited, trackingCode, type EncryptedBallot } from "../ballot";
import { selectionVector, manifestHash } from "../manifest";
import { combine, countMatches, partialDecrypt, lagrange } from "../threshold";
import { sealKeyfile, openKeyfile } from "../keyfile";
import { verifyBoard } from "../verifier";
import { shortTrackingCode, normaliseShortCode } from "../encoding";
import { ELECTION, buildBoard, ceremony, makeManifest, plainTally } from "./simulate";

describe("group encodings (RFC 9496)", () => {
  it("matches the RFC 9496 multiples of the generator", () => {
    // RFC 9496 §A.1: encodings of 0·B, 1·B, 2·B, 5·B
    expect(pointToHex(IDENTITY)).toBe("0".repeat(64));
    expect(pointToHex(G)).toBe("e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76");
    expect(pointToHex(mulBase(2n))).toBe("6a493210f7499cd17fecb510ae0cea23a110e8d5b901f8acadd3095c73a3b919");
    expect(pointToHex(mulBase(5n))).toBe("e882b131016b52c1d3337080187cf768423efccbb517bb495ab812c4160ff44e");
  });

  it("rejects non-canonical encodings", () => {
    expect(() => pointFromHex("f".repeat(64))).toThrow();
    expect(() => pointFromHex("00")).toThrow();
  });
});

describe("zero-knowledge proofs", () => {
  const sk = randomScalar();
  const H = mulBase(sk);

  it("0/1 proof accepts 0 and 1", () => {
    for (const m of [0, 1]) {
      const r = randomScalar();
      const ct = encrypt(m, r, H);
      expect(rangeVerify("ctx", H, ct, 1, rangeProve("ctx", H, ct, m, r, 1))).toBe(true);
    }
  });

  it("cannot prove a ciphertext of 2 (or 1000) is 0/1", () => {
    for (const m of [2, 1000]) {
      const r = randomScalar();
      const ct = encrypt(m, r, H);
      // A cheating prover must claim some value in range; the transcript then fails.
      const forged = rangeProve("ctx", H, encrypt(1, r, H), 1, r, 1);
      expect(rangeVerify("ctx", H, ct, 1, forged)).toBe(false);
      expect(() => rangeProve("ctx", H, ct, m, r, 1)).toThrow();
    }
  });

  it("proof bound to a context fails in another", () => {
    const r = randomScalar();
    const ct = encrypt(1, r, H);
    const p = rangeProve("ballot-A", H, ct, 1, r, 1);
    expect(rangeVerify("ballot-B", H, ct, 1, p)).toBe(false);
  });

  it("exact proof", () => {
    const r = randomScalar();
    const ct = encrypt(1, r, H);
    const p = exactProve("c", H, ct, 1, r);
    expect(exactVerify("c", H, ct, 1, p)).toBe(true);
    expect(exactVerify("c", H, ct, 2, p)).toBe(false);
  });

  it("schnorr proof", () => {
    const x = randomScalar();
    const X = mulBase(x);
    const p = schnorrProve("s", x, X);
    expect(schnorrVerify("s", X, p)).toBe(true);
    expect(schnorrVerify("s", mulBase(x + 1n), p)).toBe(false);
  });
});

describe("ballots", () => {
  const m = makeManifest();
  const c = ceremony();

  it("honest ballots verify", () => {
    for (const [list, cand] of [[100, 500], [100, null], [101, 600]] as const) {
      const { ballot } = encryptBallot(m, c.jointPk, "cred-1", selectionVector(m, list, cand));
      expect(verifyBallot(m, c.jointPk, ballot)).toEqual({ ok: true });
    }
  });

  it("client refuses to encrypt a rule-breaking selection", () => {
    expect(() => encryptBallot(m, c.jointPk, "cred", [1, 1, 0, 0, 0])).toThrow();
    expect(() => encryptBallot(m, c.jointPk, "cred", [1, 0, 0, 0, 1])).toThrow(); // candidate off the chosen list
  });

  it("server rejects an over-vote smuggled past the client (1000 votes for one list)", () => {
    const { ballot } = encryptBallot(m, c.jointPk, "cred", selectionVector(m, 100, null));
    const H = pointFromHex(c.jointPk);
    const r = randomScalar();
    const evil: EncryptedBallot = { ...ballot, ciphertexts: [...ballot.ciphertexts] };
    evil.ciphertexts[0] = toJson(encrypt(1000, r, H));
    expect(verifyBallot(m, c.jointPk, evil).ok).toBe(false);
  });

  it("rejects two lists at once even with valid 0/1 proofs", () => {
    // Forge by encrypting each option separately (all proofs honest) but violating the exact-1 rule.
    const good = encryptBallot(m, c.jointPk, "cred", selectionVector(m, 100, null)).ballot;
    const other = encryptBallot(m, c.jointPk, "cred", selectionVector(m, 101, null)).ballot;
    const evil: EncryptedBallot = {
      ...good,
      ciphertexts: [good.ciphertexts[0], other.ciphertexts[1], ...good.ciphertexts.slice(2)],
      option_proofs: [good.option_proofs[0], other.option_proofs[1], ...good.option_proofs.slice(2)],
    };
    expect(verifyBallot(m, c.jointPk, evil).ok).toBe(false);
  });

  it("rejects a replayed ballot under another voter's credential", () => {
    const { ballot } = encryptBallot(m, c.jointPk, "alice", selectionVector(m, 100, 500));
    expect(verifyBallot(m, c.jointPk, { ...ballot, credential: "bob" }).ok).toBe(false);
  });

  it("Benaloh audit passes for an honest client", () => {
    const { ballot, secrets } = encryptBallot(m, c.jointPk, "cred", selectionVector(m, 100, 501));
    expect(verifyAudit(m, c.jointPk, toAudited(ballot, secrets))).toEqual({ ok: true });
  });

  it("Benaloh audit catches a corrupted client that flips the vote", () => {
    // The malicious client shows the voter "Unity / R. Khoury" but encrypts "Change / S. Nasr".
    const shown = selectionVector(m, 100, 501);
    const { ballot, secrets } = encryptBallot(m, c.jointPk, "cred", selectionVector(m, 101, 600));
    const claimed = toAudited(ballot, { ...secrets, selections: shown });
    const res = verifyAudit(m, c.jointPk, claimed);
    expect(res.ok).toBe(false);
    // …and its ballot is still perfectly valid, which is why only an audit can catch it.
    expect(verifyBallot(m, c.jointPk, ballot).ok).toBe(true);
  });

  it("manifest tampering changes the hash", () => {
    const t = { ...m, options: m.options.map((o, i) => (i === 0 ? { ...o, label: "Evil" } : o)) };
    expect(manifestHash(t)).not.toBe(m.hash);
  });
});

describe("threshold decryption", () => {
  const m = makeManifest();
  const c = ceremony(3, 2);
  const votes = [
    { credential: "a", list: 100, candidate: 500 },
    { credential: "b", list: 101, candidate: 600 },
    { credential: "c", list: 100, candidate: null },
  ];

  it("works with exactly k trustees (any pair)", () => {
    for (const pair of [[1, 2], [1, 3], [2, 3]]) {
      const board = buildBoard(c, m, votes, pair);
      const plain = plainTally(m, votes);
      for (const r of board.tally!.results) expect(r.count).toBe(plain.get(r.key));
    }
  });

  it("fails with k−1 trustees", () => {
    const board = buildBoard(c, m, votes, [1, 2]);
    const agg = board.tally!.aggregates.find((a) => a.key.endsWith("list:100"))!;
    const one = partialDecrypt(ELECTION, 1, c.shares.get(1)!, [agg]);
    const mG = combine(agg, new Map([[1, pointFromHex(one[0].m)]]));
    for (let n = 0; n <= votes.length; n++) expect(countMatches(mG, n)).toBe(false);
  });

  it("lagrange coefficients reconstruct f(0) = Σ λ_j f(j)", () => {
    const a0 = randomScalar(), a1 = randomScalar();
    const f = (x: bigint) => (a0 + a1 * x);
    const idx = [2, 3];
    const lam = idx.map((j) => lagrange(idx, j));
    const rec = (lam[0] * f(2n) + lam[1] * f(3n)) % (2n ** 252n + 27742317777372353535851937790883648493n);
    expect(scalarToHex(rec)).toBe(scalarToHex(a0));
  });
});

describe("independent verifier", () => {
  const m = makeManifest();
  const c = ceremony(3, 2);
  const votes = [
    { credential: "a", list: 100, candidate: 500 },
    { credential: "b", list: 101, candidate: 600 },
    { credential: "a", list: 101, candidate: null }, // re-vote: supersedes a's first ballot
    { credential: "d", list: 100, candidate: 501 },
  ];

  it("passes an honest board and counts only the latest ballot", () => {
    const board = buildBoard(c, m, votes);
    const report = verifyBoard(board);
    expect(report.checks.filter((x) => !x.ok)).toEqual([]);
    const plain = plainTally(m, votes);
    for (const r of board.tally!.results) expect(r.count).toBe(plain.get(r.key));
    expect(board.ballots.filter((b) => b.status === "superseded")).toHaveLength(1);
  });

  it("fails when a ballot is tampered with", () => {
    const board = buildBoard(c, m, votes);
    const H = pointFromHex(c.jointPk);
    board.ballots[1].ballot.ciphertexts[0] = toJson(encrypt(1, randomScalar(), H));
    const rep = verifyBoard(board);
    expect(rep.ok).toBe(false);
    expect(rep.checks.find((x) => x.id === "ballots")!.ok).toBe(false);
  });

  it("fails when the tally is tampered with", () => {
    const board = buildBoard(c, m, votes);
    const H = pointFromHex(c.jointPk);
    const extra = encrypt(1, randomScalar(), H);
    const a = board.tally!.aggregates[0];
    const sum = fromJson(a);
    Object.assign(a, toJson({ A: sum.A.add(extra.A), B: sum.B.add(extra.B) }));
    expect(verifyBoard(board).checks.find((x) => x.id === "aggregate")!.ok).toBe(false);
  });

  it("fails when a partial decryption is tampered with", () => {
    const board = buildBoard(c, m, votes);
    board.tally!.partials[0].shares[0].m = pointToHex(mulBase(randomScalar()));
    expect(verifyBoard(board).checks.find((x) => x.id === "decryption")!.ok).toBe(false);
  });

  it("fails when a published result is changed", () => {
    const board = buildBoard(c, m, votes);
    board.tally!.results[0].count += 1;
    expect(verifyBoard(board).ok).toBe(false);
  });

  it("fails when a counted ballot is hidden as superseded", () => {
    const board = buildBoard(c, m, votes);
    board.ballots[1].status = "superseded";
    expect(verifyBoard(board).checks.find((x) => x.id === "revotes")!.ok).toBe(false);
  });

  it("fails when the election key is swapped", () => {
    const board = buildBoard(c, m, votes);
    board.election.joint_public_key = pointToHex(mulBase(randomScalar()));
    expect(verifyBoard(board).checks.find((x) => x.id === "keys")!.ok).toBe(false);
  });
});

describe("key files and tracking codes", () => {
  it("round-trips and rejects a wrong passphrase", async () => {
    const f = await sealKeyfile({ kind: "share", election_id: 1, trustee_index: 2 }, { share: "ab" }, "correct horse battery", { t: 1, m: 256 });
    expect(await openKeyfile(f, "correct horse battery")).toEqual({ share: "ab" });
    await expect(openKeyfile(f, "wrong passphrase!!")).rejects.toThrow(/Wrong passphrase/);
    const tampered = { ...f, meta: { ...f.meta, trustee_index: 3 } };
    await expect(openKeyfile(tampered, "correct horse battery")).rejects.toThrow();
  });

  it("short codes are 16 Crockford chars and normalise typing errors", () => {
    const s = shortTrackingCode("00".repeat(32));
    expect(s).toBe("0000-0000-0000-0000");
    const t = shortTrackingCode("ff".repeat(32));
    expect(t).toBe("ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    expect(normaliseShortCode("oooo oooo-oooo oooo")).toBe("0000-0000-0000-0000");
  });

  it("tracking code depends only on the ciphertexts", () => {
    const m = makeManifest();
    const c = ceremony();
    const { ballot } = encryptBallot(m, c.jointPk, "x", selectionVector(m, 100, null));
    expect(trackingCode(ballot).full).toBe(trackingCode({ ...ballot, credential: "zzz" }).full);
    void hashToScalar; void intScalar;
  });
});
