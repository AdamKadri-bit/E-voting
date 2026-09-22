/**
 * ristretto255 group helpers — the only place the client touches curve math.
 *
 * Every primitive here is delegated to audited libraries: @noble/curves for
 * the group (RFC 9496 ristretto255) and @noble/hashes for SHA-2 and the CSPRNG.
 * This file only fixes the *encodings* the protocol uses, so the browser, the
 * CLI verifier and the PHP server (libsodium) all agree byte-for-byte:
 *
 *   point  -> 32-byte canonical ristretto255 encoding, lowercase hex
 *   scalar -> 32-byte little-endian integer mod L, lowercase hex
 *
 * The PHP mirror lives in backend/app/Crypto/Group.php; the shared vectors in
 * backend/tests/Fixtures/crypto-vectors.json keep the two honest.
 */
import { ristretto255 } from "@noble/curves/ed25519.js";
import { bytesToNumberLE, numberToBytesLE } from "@noble/curves/utils.js";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

export const Point = ristretto255.Point;
export type Point = InstanceType<typeof ristretto255.Point>;

/** Prime order of the group. */
export const L: bigint = Point.Fn.ORDER;
const Fn = Point.Fn;

export const G: Point = Point.BASE;
export const IDENTITY: Point = Point.ZERO;

/** Protocol version tag mixed into every hash, so v1 proofs never verify under a later scheme. */
export const PROTOCOL = "evote-v1";

export const mod = (x: bigint): bigint => Fn.create(x);
export const sAdd = (a: bigint, b: bigint): bigint => Fn.add(a, b);
export const sSub = (a: bigint, b: bigint): bigint => Fn.sub(a, b);
export const sMul = (a: bigint, b: bigint): bigint => Fn.mul(a, b);
export const sInv = (a: bigint): bigint => Fn.inv(a);

export function scalarToHex(s: bigint): string {
  return bytesToHex(numberToBytesLE(mod(s), 32));
}

/** Parses a scalar, rejecting non-canonical encodings (>= L) so a proof has one byte form. */
export function scalarFromHex(hex: string): bigint {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("invalid scalar encoding");
  const n = bytesToNumberLE(hexToBytes(hex));
  if (n >= L) throw new Error("non-canonical scalar");
  return n;
}

export function pointToHex(p: Point): string {
  return bytesToHex(p.toBytes());
}

/** Decodes a point; noble rejects anything that is not a canonical ristretto255 encoding. */
export function pointFromHex(hex: string): Point {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("invalid point encoding");
  return Point.fromHex(hex);
}

/** Uniform scalar in [1, L): 64 random bytes reduced mod L (bias < 2^-250). */
export function randomScalar(): bigint {
  for (;;) {
    const s = mod(bytesToNumberLE(randomBytes(64)));
    if (s !== 0n) return s;
  }
}

/**
 * k·P. Constant-time path for secret non-zero scalars; zero maps to the identity
 * (noble refuses 0, and the protocol legitimately needs g^0 for "no vote").
 */
export function mul(p: Point, k: bigint): Point {
  const s = mod(k);
  if (s === 0n || p.equals(IDENTITY)) return IDENTITY;
  return p.multiply(s);
}

/** k·P for public values (verification): variable-time, accepts zero. */
export function mulPublic(p: Point, k: bigint): Point {
  return p.multiplyUnsafe(mod(k));
}

export const mulBase = (k: bigint): Point => mul(G, k);

/** Encodes an integer (a vote count or option value) as the scalar m, for g^m. */
export const intScalar = (n: number | bigint): bigint => mod(BigInt(n));

/**
 * Fiat–Shamir hash to a scalar. Each item is length-prefixed (4-byte BE) so no
 * two different transcripts can serialise to the same bytes.
 */
export function hashToScalar(domain: string, items: string[]): bigint {
  const parts: Uint8Array[] = [];
  const push = (s: string) => {
    const b = utf8ToBytes(s);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, b.length, false);
    parts.push(len, b);
  };
  push(`${PROTOCOL}|${domain}`);
  items.forEach(push);
  return mod(bytesToNumberLE(sha512(concatBytes(...parts))));
}

export function sha256Hex(s: string): string {
  return bytesToHex(sha256(utf8ToBytes(s)));
}

export { bytesToHex, hexToBytes, randomBytes, utf8ToBytes, concatBytes };
