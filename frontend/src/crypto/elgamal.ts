/**
 * Exponential ElGamal over ristretto255.
 *
 *   Enc(m; r) = (A, B) = (r·G, m·G + r·H)     H = joint election public key
 *
 * Putting m in the exponent makes the scheme additively homomorphic: adding
 * ciphertexts component-wise encrypts the sum of the votes, which is how the
 * tally is formed without decrypting any individual ballot.
 */
import { G, IDENTITY, type Point, intScalar, mul, mulBase, mulPublic, pointFromHex, pointToHex } from "./group";

export type Ciphertext = { a: string; b: string };
export type CiphertextPoints = { A: Point; B: Point };

export function encrypt(m: number, r: bigint, H: Point): CiphertextPoints {
  return { A: mulBase(r), B: mulBase(intScalar(m)).add(mul(H, r)) };
}

export const toJson = (c: CiphertextPoints): Ciphertext => ({ a: pointToHex(c.A), b: pointToHex(c.B) });
export const fromJson = (c: Ciphertext): CiphertextPoints => ({ A: pointFromHex(c.a), B: pointFromHex(c.b) });

export function add(x: CiphertextPoints, y: CiphertextPoints): CiphertextPoints {
  return { A: x.A.add(y.A), B: x.B.add(y.B) };
}

export function sub(x: CiphertextPoints, y: CiphertextPoints): CiphertextPoints {
  return { A: x.A.subtract(y.A), B: x.B.subtract(y.B) };
}

export const zero = (): CiphertextPoints => ({ A: IDENTITY, B: IDENTITY });

export function sum(cs: CiphertextPoints[]): CiphertextPoints {
  return cs.reduce(add, zero());
}

/**
 * Recovers m·G from a ciphertext given its randomness — used only by the
 * Benaloh audit on the voter's *own* spoiled ballot, never on a cast one.
 */
export function openWithRandomness(c: CiphertextPoints, r: bigint, H: Point): Point {
  return c.B.subtract(mulPublic(H, r));
}

/** Small discrete log by trial, for audit values (0..max, max tiny). */
export function smallLog(mG: Point, max: number): number | null {
  let acc = IDENTITY;
  for (let m = 0; m <= max; m++) {
    if (acc.equals(mG)) return m;
    acc = acc.add(G);
  }
  return null;
}
