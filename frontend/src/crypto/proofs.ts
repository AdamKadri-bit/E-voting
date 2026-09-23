/**
 * Non-interactive zero-knowledge proofs (Fiat–Shamir, SHA-512 → scalar).
 *
 *   Schnorr        — knowledge of x with X = x·G   (trustee key shares)
 *   Range (0..max) — a ciphertext encrypts one of 0..max, without saying which
 *                    (disjunctive Chaum–Pedersen; max = 1 is the classic 0/1 proof)
 *   Exact (K)      — a ciphertext encrypts exactly K (Chaum–Pedersen)
 *   Equality       — log_G(X) = log_A(M): a trustee's partial decryption is honest
 *
 * `ctx` binds every proof to one election, ballot manifest and voter credential,
 * so a proof cannot be lifted from one ballot and replayed on another.
 */
import {
  G,
  type Point,
  hashToScalar,
  intScalar,
  mul,
  mulBase,
  mulPublic,
  pointFromHex,
  pointToHex,
  randomScalar,
  sAdd,
  sMul,
  sSub,
  scalarFromHex,
  scalarToHex,
} from "./group";
import type { CiphertextPoints } from "./elgamal";

const P = pointToHex;

/* ---------------------------------------------------------------- Schnorr */

export type SchnorrProof = { r: string; z: string };

export function schnorrProve(ctx: string, x: bigint, X: Point): SchnorrProof {
  const k = randomScalar();
  const R = mulBase(k);
  const c = hashToScalar("schnorr", [ctx, P(X), P(R)]);
  return { r: P(R), z: scalarToHex(sAdd(k, sMul(c, x))) };
}

export function schnorrVerify(ctx: string, X: Point, proof: SchnorrProof): boolean {
  try {
    const R = pointFromHex(proof.r);
    const c = hashToScalar("schnorr", [ctx, P(X), P(R)]);
    const z = scalarFromHex(proof.z);
    return mulPublic(G, z).equals(R.add(mulPublic(X, c)));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ Range proof */

export type RangeProof = { c: string[]; z: string[] };

/**
 * Proves (A, B) encrypts `value` ∈ {0..max} under H with randomness r.
 * The real branch is answered honestly; every other branch is simulated from a
 * random challenge and response, and the challenges must sum to the hash.
 */
export function rangeProve(
  ctx: string,
  H: Point,
  ct: CiphertextPoints,
  value: number,
  r: bigint,
  max: number
): RangeProof {
  if (value < 0 || value > max) throw new Error("value outside range");
  const cs: bigint[] = new Array(max + 1);
  const zs: bigint[] = new Array(max + 1);
  const TA: Point[] = new Array(max + 1);
  const TB: Point[] = new Array(max + 1);
  const k = randomScalar();

  for (let j = 0; j <= max; j++) {
    if (j === value) {
      TA[j] = mulBase(k);
      TB[j] = mul(H, k);
    } else {
      cs[j] = randomScalar();
      zs[j] = randomScalar();
      const Bj = ct.B.subtract(mulBase(intScalar(j)));
      TA[j] = mulBase(zs[j]).subtract(mul(ct.A, cs[j]));
      TB[j] = mul(H, zs[j]).subtract(mul(Bj, cs[j]));
    }
  }

  const c = hashToScalar("range", rangeTranscript(ctx, H, ct, max, TA, TB));
  let others = 0n;
  for (let j = 0; j <= max; j++) if (j !== value) others = sAdd(others, cs[j]);
  cs[value] = sSub(c, others);
  zs[value] = sAdd(k, sMul(cs[value], r));

  return { c: cs.map(scalarToHex), z: zs.map(scalarToHex) };
}

export function rangeVerify(ctx: string, H: Point, ct: CiphertextPoints, max: number, proof: RangeProof): boolean {
  try {
    if (proof.c.length !== max + 1 || proof.z.length !== max + 1) return false;
    const TA: Point[] = [];
    const TB: Point[] = [];
    let total = 0n;
    for (let j = 0; j <= max; j++) {
      const cj = scalarFromHex(proof.c[j]);
      const zj = scalarFromHex(proof.z[j]);
      const Bj = ct.B.subtract(mulPublic(G, intScalar(j)));
      TA.push(mulPublic(G, zj).subtract(mulPublic(ct.A, cj)));
      TB.push(mulPublic(H, zj).subtract(mulPublic(Bj, cj)));
      total = sAdd(total, cj);
    }
    return total === hashToScalar("range", rangeTranscript(ctx, H, ct, max, TA, TB));
  } catch {
    return false;
  }
}

function rangeTranscript(ctx: string, H: Point, ct: CiphertextPoints, max: number, TA: Point[], TB: Point[]): string[] {
  const items = [ctx, P(H), P(ct.A), P(ct.B), String(max)];
  for (let j = 0; j <= max; j++) items.push(P(TA[j]), P(TB[j]));
  return items;
}

/* ------------------------------------------------------------ Exact value */

export type ExactProof = { c: string; z: string };

export function exactProve(ctx: string, H: Point, ct: CiphertextPoints, value: number, r: bigint): ExactProof {
  const k = randomScalar();
  const T1 = mulBase(k);
  const T2 = mul(H, k);
  const c = hashToScalar("exact", [ctx, P(H), P(ct.A), P(ct.B), String(value), P(T1), P(T2)]);
  return { c: scalarToHex(c), z: scalarToHex(sAdd(k, sMul(c, r))) };
}

export function exactVerify(ctx: string, H: Point, ct: CiphertextPoints, value: number, proof: ExactProof): boolean {
  try {
    const c = scalarFromHex(proof.c);
    const z = scalarFromHex(proof.z);
    const Bk = ct.B.subtract(mulPublic(G, intScalar(value)));
    const T1 = mulPublic(G, z).subtract(mulPublic(ct.A, c));
    const T2 = mulPublic(H, z).subtract(mulPublic(Bk, c));
    return c === hashToScalar("exact", [ctx, P(H), P(ct.A), P(ct.B), String(value), P(T1), P(T2)]);
  } catch {
    return false;
  }
}

/* -------------------------------------------- Equality of discrete logs */

export type EqualityProof = { c: string; z: string };

/** Proves X = x·G and M = x·A share the same x (Chaum–Pedersen). */
export function equalityProve(ctx: string, x: bigint, X: Point, A: Point, M: Point): EqualityProof {
  const k = randomScalar();
  const T1 = mulBase(k);
  const T2 = mul(A, k);
  const c = hashToScalar("equality", [ctx, P(X), P(A), P(M), P(T1), P(T2)]);
  return { c: scalarToHex(c), z: scalarToHex(sAdd(k, sMul(c, x))) };
}

export function equalityVerify(ctx: string, X: Point, A: Point, M: Point, proof: EqualityProof): boolean {
  try {
    const c = scalarFromHex(proof.c);
    const z = scalarFromHex(proof.z);
    const T1 = mulPublic(G, z).subtract(mulPublic(X, c));
    const T2 = mulPublic(A, z).subtract(mulPublic(M, c));
    return c === hashToScalar("equality", [ctx, P(X), P(A), P(M), P(T1), P(T2)]);
  } catch {
    return false;
  }
}
