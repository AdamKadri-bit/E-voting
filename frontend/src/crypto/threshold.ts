/**
 * k-of-n threshold keys with no trusted dealer (Pedersen DKG with Feldman
 * verifiable secret sharing), and threshold decryption of the tally.
 *
 * Round 1  trustee i picks a random degree-(k−1) polynomial f_i, publishes
 *          A_im = a_im·G for every coefficient (+ a Schnorr proof of each), and
 *          a communication key for receiving shares.
 * Round 2  trustee i sends f_i(j) to every other trustee j, sealed to j's key.
 * Round 3  trustee j opens its shares, checks each against the public
 *          commitments (Feldman), and keeps s_j = Σ_i f_i(j).
 *
 * The election key is H = Σ_i A_i0; its secret s = Σ_i f_i(0) is never
 * assembled anywhere. Any k trustees can decrypt the tally; k−1 learn nothing.
 */
import { bytesToNumberLE, numberToBytesLE } from "@noble/curves/utils.js";
import {
  G,
  IDENTITY,
  L,
  type Point,
  intScalar,
  mulBase,
  mulPublic,
  pointFromHex,
  pointToHex,
  randomScalar,
  sAdd,
  sInv,
  sMul,
  sSub,
  scalarFromHex,
  scalarToHex,
} from "./group";
import { hashItems } from "./encoding";
import { type SchnorrProof, schnorrProve, schnorrVerify, type EqualityProof, equalityProve, equalityVerify } from "./proofs";
import { type SealedBox, open, seal } from "./ecies";

export type Round1Public = {
  trustee_index: number;
  comm_public_key: string;
  comm_proof: SchnorrProof;
  commitments: string[];
  commitment_proofs: SchnorrProof[];
};

export type Round1Secret = {
  comm_secret: string;
  coefficients: string[];
};

export type EncryptedShare = SealedBox & { from: number; to: number };

export const commCtx = (electionId: number, i: number) => hashItems("dkg-comm", [String(electionId), String(i)]);
export const coefCtx = (electionId: number, i: number, m: number) =>
  hashItems("dkg-coef", [String(electionId), String(i), String(m)]);
export const shareInfo = (electionId: number, from: number, to: number) => `evote-v1|share|${electionId}|${from}|${to}`;

export function round1(electionId: number, index: number, threshold: number): { pub: Round1Public; secret: Round1Secret } {
  const comm = randomScalar();
  const C = mulBase(comm);
  const coefficients = Array.from({ length: threshold }, () => randomScalar());
  const commitments = coefficients.map((a) => mulBase(a));
  return {
    pub: {
      trustee_index: index,
      comm_public_key: pointToHex(C),
      comm_proof: schnorrProve(commCtx(electionId, index), comm, C),
      commitments: commitments.map(pointToHex),
      commitment_proofs: coefficients.map((a, m) => schnorrProve(coefCtx(electionId, index, m), a, commitments[m])),
    },
    secret: { comm_secret: scalarToHex(comm), coefficients: coefficients.map(scalarToHex) },
  };
}

export function verifyRound1(electionId: number, threshold: number, r: Round1Public): boolean {
  try {
    if (r.commitments.length !== threshold || r.commitment_proofs.length !== threshold) return false;
    if (!schnorrVerify(commCtx(electionId, r.trustee_index), pointFromHex(r.comm_public_key), r.comm_proof)) return false;
    return r.commitments.every((c, m) => schnorrVerify(coefCtx(electionId, r.trustee_index, m), pointFromHex(c), r.commitment_proofs[m]));
  } catch {
    return false;
  }
}

/** f(x) = Σ a_m x^m mod L (Horner). */
export function evalPoly(coefficients: bigint[], x: number): bigint {
  const X = intScalar(x);
  let acc = 0n;
  for (let m = coefficients.length - 1; m >= 0; m--) acc = sAdd(sMul(acc, X), coefficients[m]);
  return acc;
}

/** Σ_m x^m·A_m — the public image f(x)·G of a committed polynomial. */
export function evalCommitments(commitments: Point[], x: number): Point {
  let acc = IDENTITY;
  let pow = 1n;
  for (const A of commitments) {
    acc = acc.add(mulPublic(A, pow));
    pow = sMul(pow, intScalar(x));
  }
  return acc;
}

export function round2(
  electionId: number,
  index: number,
  secret: Round1Secret,
  others: { trustee_index: number; comm_public_key: string }[]
): EncryptedShare[] {
  const coefficients = secret.coefficients.map(scalarFromHex);
  return others
    .filter((o) => o.trustee_index !== index)
    .map((o) => {
      const share = evalPoly(coefficients, o.trustee_index);
      const box = seal(pointFromHex(o.comm_public_key), numberToBytesLE(share, 32), shareInfo(electionId, index, o.trustee_index));
      return { ...box, from: index, to: o.trustee_index };
    });
}

export type Round3Result = {
  share: string;
  share_public_key: string;
  joint_public_key: string;
  complaints: number[];
};

/** Opens and checks every share addressed to `index`; returns the final key share. */
export function round3(
  electionId: number,
  index: number,
  secret: Round1Secret,
  all: Round1Public[],
  incoming: EncryptedShare[]
): Round3Result {
  const comm = scalarFromHex(secret.comm_secret);
  const own = evalPoly(secret.coefficients.map(scalarFromHex), index);
  let s = own;
  const complaints: number[] = [];

  for (const r of all) {
    if (r.trustee_index === index) continue;
    const box = incoming.find((b) => b.from === r.trustee_index && b.to === index);
    if (!box) {
      complaints.push(r.trustee_index);
      continue;
    }
    try {
      const share = bytesToNumberLE(open(comm, box, shareInfo(electionId, r.trustee_index, index)));
      if (share >= L) throw new Error("bad share");
      const expected = evalCommitments(r.commitments.map(pointFromHex), index);
      if (!mulBase(share).equals(expected)) throw new Error("share fails Feldman check");
      s = sAdd(s, share);
    } catch {
      complaints.push(r.trustee_index);
    }
  }

  return {
    share: scalarToHex(s),
    share_public_key: pointToHex(mulBase(s)),
    joint_public_key: pointToHex(jointPublicKey(all)),
    complaints,
  };
}

export function jointPublicKey(all: Round1Public[]): Point {
  return all.reduce((acc, r) => acc.add(pointFromHex(r.commitments[0])), IDENTITY);
}

/** S_j = s_j·G, computed from public commitments alone. */
export function sharePublicKey(all: Round1Public[], j: number): Point {
  return all.reduce((acc, r) => acc.add(evalCommitments(r.commitments.map(pointFromHex), j)), IDENTITY);
}

/* ---------------------------------------------------- Threshold decryption */

export type AggregateCiphertext = { key: string; a: string; b: string };
export type PartialShare = { key: string; m: string; proof: EqualityProof };

export const pdecCtx = (electionId: number, j: number, key: string) => hashItems("pdec", [String(electionId), String(j), key]);

export function partialDecrypt(electionId: number, j: number, shareHex: string, aggregates: AggregateCiphertext[]): PartialShare[] {
  const s = scalarFromHex(shareHex);
  const S = mulBase(s);
  return aggregates.map((agg) => {
    const A = pointFromHex(agg.a);
    const M = A.equals(IDENTITY) ? IDENTITY : A.multiply(s);
    return { key: agg.key, m: pointToHex(M), proof: equalityProve(pdecCtx(electionId, j, agg.key), s, S, A, M) };
  });
}

export function verifyPartial(electionId: number, j: number, S: Point, agg: AggregateCiphertext, p: PartialShare): boolean {
  try {
    return p.key === agg.key && equalityVerify(pdecCtx(electionId, j, agg.key), S, pointFromHex(agg.a), pointFromHex(p.m), p.proof);
  } catch {
    return false;
  }
}

/** λ_j = Π_{m≠j} m / (m − j) mod L, for interpolating f(0) from the set `indices`. */
export function lagrange(indices: number[], j: number): bigint {
  let num = 1n;
  let den = 1n;
  for (const m of indices) {
    if (m === j) continue;
    num = sMul(num, intScalar(m));
    den = sMul(den, sSub(intScalar(m), intScalar(j)));
  }
  return sMul(num, sInv(den));
}

/** B − Σ λ_j·M_j = count·G, given partials from exactly the trustees in `indices`. */
export function combine(agg: AggregateCiphertext, partials: Map<number, Point>): Point {
  const indices = [...partials.keys()];
  let sA = IDENTITY;
  for (const j of indices) sA = sA.add(mulPublic(partials.get(j)!, lagrange(indices, j)));
  return pointFromHex(agg.b).subtract(sA);
}

export function countMatches(mG: Point, count: number): boolean {
  return mG.equals(mulPublic(G, intScalar(count)));
}
