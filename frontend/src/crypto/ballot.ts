/**
 * Ballot encryption, verification and Benaloh auditing.
 *
 * encryptBallot() runs in the voter's browser (inside a Web Worker). The server
 * and the independent verifier run verifyBallot() — the exact same checks —
 * before a ballot is accepted or counted.
 */
import { type Point, pointFromHex, pointToHex, randomScalar, sAdd, sSub, scalarFromHex, scalarToHex } from "./group";
import { type Ciphertext, type CiphertextPoints, encrypt, fromJson, sub, sum, toJson } from "./elgamal";
import { hashItems, shortTrackingCode } from "./encoding";
import { type Manifest, type ManifestConstraint, constraintValue, manifestHash, satisfies } from "./manifest";
import { type ExactProof, type RangeProof, exactProve, exactVerify, rangeProve, rangeVerify } from "./proofs";

export type EncryptedBallot = {
  election_id: number;
  manifest_id: number;
  manifest_hash: string;
  credential: string;
  ciphertexts: Ciphertext[];
  option_proofs: RangeProof[];
  constraint_proofs: (RangeProof | ExactProof)[];
};

/** Everything the voter's browser keeps back until Cast or Audit is chosen. */
export type BallotSecrets = {
  selections: number[];
  randomness: string[];
};

export type AuditedBallot = {
  election_id: number;
  manifest_id: number;
  manifest_hash: string;
  ciphertexts: Ciphertext[];
  selections: number[];
  randomness: string[];
};

/** Binds proofs to one election, ballot style, public key and voter credential. */
export function proofContext(electionId: number, manifestHashHex: string, jointPk: string, credential: string): string {
  return hashItems("ctx", [String(electionId), manifestHashHex, jointPk, credential]);
}

/** Full tracking hash: commits to the ciphertexts only, so audited ballots are recomputable. */
export function trackingHash(electionId: number, manifestHashHex: string, cts: Ciphertext[]): string {
  const items = [String(electionId), manifestHashHex, String(cts.length)];
  for (const c of cts) items.push(c.a, c.b);
  return hashItems("tracking", items);
}

export function trackingCode(b: { election_id: number; manifest_hash: string; ciphertexts: Ciphertext[] }) {
  const full = trackingHash(b.election_id, b.manifest_hash, b.ciphertexts);
  return { full, short: shortTrackingCode(full) };
}

function constraintCiphertext(c: ManifestConstraint, cts: CiphertextPoints[]): CiphertextPoints {
  const s = sum(c.indices.map((i) => cts[i]));
  return c.type === "implies" ? sub(cts[c.parent!], s) : s;
}

function constraintRandomness(c: ManifestConstraint, rs: bigint[]): bigint {
  const s = c.indices.reduce((acc, i) => sAdd(acc, rs[i]), 0n);
  return c.type === "implies" ? sSub(rs[c.parent!], s) : s;
}

/** Upper bound of the range a constraint's value must fall in (exact uses its own proof). */
const constraintMax = (c: ManifestConstraint) => (c.type === "implies" ? 1 : c.value);

export type Progress = (done: number, total: number) => void;

export function encryptBallot(
  manifest: Manifest,
  jointPkHex: string,
  credential: string,
  selections: number[],
  onProgress?: Progress
): { ballot: EncryptedBallot; secrets: BallotSecrets } {
  if (manifestHash(manifest) !== manifest.hash) throw new Error("Manifest hash mismatch — refusing to encrypt.");
  if (!satisfies(manifest, selections)) throw new Error("Selection breaks the ballot rules.");

  const H = pointFromHex(jointPkHex);
  const ctx = proofContext(manifest.election_id, manifest.hash, jointPkHex, credential);
  const total = selections.length + manifest.constraints.length;
  let done = 0;

  const rs: bigint[] = [];
  const cts: CiphertextPoints[] = [];
  const optionProofs: RangeProof[] = [];

  selections.forEach((m) => {
    const r = randomScalar();
    const ct = encrypt(m, r, H);
    rs.push(r);
    cts.push(ct);
    optionProofs.push(rangeProve(ctx, H, ct, m, r, 1));
    onProgress?.(++done, total);
  });

  const constraintProofs = manifest.constraints.map((c) => {
    const ct = constraintCiphertext(c, cts);
    const r = constraintRandomness(c, rs);
    const v = constraintValue(c, selections);
    const proof = c.type === "exact" ? exactProve(ctx, H, ct, c.value, r) : rangeProve(ctx, H, ct, v, r, constraintMax(c));
    onProgress?.(++done, total);
    return proof;
  });

  return {
    ballot: {
      election_id: manifest.election_id,
      manifest_id: manifest.id,
      manifest_hash: manifest.hash,
      credential,
      ciphertexts: cts.map(toJson),
      option_proofs: optionProofs,
      constraint_proofs: constraintProofs,
    },
    secrets: { selections, randomness: rs.map(scalarToHex) },
  };
}

export type BallotCheck = { ok: boolean; reason?: string };

/** The acceptance test for a cast ballot — identical on server, verifier and here. */
export function verifyBallot(manifest: Manifest, jointPkHex: string, b: EncryptedBallot): BallotCheck {
  try {
    if (b.manifest_hash !== manifest.hash || manifestHash(manifest) !== manifest.hash)
      return { ok: false, reason: "manifest mismatch" };
    if (b.election_id !== manifest.election_id) return { ok: false, reason: "wrong election" };
    const n = manifest.options.length;
    if (b.ciphertexts.length !== n || b.option_proofs.length !== n)
      return { ok: false, reason: "wrong number of ciphertexts" };
    if (b.constraint_proofs.length !== manifest.constraints.length)
      return { ok: false, reason: "wrong number of constraint proofs" };

    const H = pointFromHex(jointPkHex);
    const ctx = proofContext(b.election_id, manifest.hash, jointPkHex, b.credential);
    const cts = b.ciphertexts.map(fromJson);

    for (let i = 0; i < n; i++) {
      if (!rangeVerify(ctx, H, cts[i], 1, b.option_proofs[i])) return { ok: false, reason: `option ${i} is not 0 or 1` };
    }
    for (let k = 0; k < manifest.constraints.length; k++) {
      const c = manifest.constraints[k];
      const ct = constraintCiphertext(c, cts);
      const p = b.constraint_proofs[k] as any;
      const ok = c.type === "exact" ? exactVerify(ctx, H, ct, c.value, p) : rangeVerify(ctx, H, ct, constraintMax(c), p);
      if (!ok) return { ok: false, reason: `constraint ${k} (${c.type}) violated` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "malformed ballot" };
  }
}

/** Builds the spoiled-ballot record the voter publishes when choosing Audit. */
export function toAudited(b: EncryptedBallot, s: BallotSecrets): AuditedBallot {
  return {
    election_id: b.election_id,
    manifest_id: b.manifest_id,
    manifest_hash: b.manifest_hash,
    ciphertexts: b.ciphertexts,
    selections: s.selections,
    randomness: s.randomness,
  };
}

/**
 * Benaloh check: re-encrypt the claimed selections with the revealed randomness
 * and demand byte-identical ciphertexts. A client that encrypted anything other
 * than what it showed the voter fails here — on any device, not just its own.
 */
export function verifyAudit(manifest: Manifest, jointPkHex: string, a: AuditedBallot): BallotCheck {
  try {
    if (a.manifest_hash !== manifest.hash) return { ok: false, reason: "manifest mismatch" };
    if (a.ciphertexts.length !== manifest.options.length || a.randomness.length !== a.ciphertexts.length)
      return { ok: false, reason: "wrong length" };
    if (!satisfies(manifest, a.selections)) return { ok: false, reason: "claimed selection breaks the ballot rules" };
    const H = pointFromHex(jointPkHex);
    for (let i = 0; i < a.ciphertexts.length; i++) {
      const re = encrypt(a.selections[i], scalarFromHex(a.randomness[i]), H);
      if (pointToHex(re.A) !== a.ciphertexts[i].a || pointToHex(re.B) !== a.ciphertexts[i].b)
        return { ok: false, reason: `option ${i} does not encrypt the claimed choice` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "malformed audit" };
  }
}

/** Human-readable decode of an audited ballot's selection. */
export function describeSelection(manifest: Manifest, selections: number[]): { list: string | null; candidate: string | null } {
  let list: string | null = null;
  let candidate: string | null = null;
  manifest.options.forEach((o, i) => {
    if (selections[i] !== 1) return;
    if (o.type === "list") list = o.label;
    else candidate = o.label;
  });
  return { list, candidate };
}

export type { Point };
