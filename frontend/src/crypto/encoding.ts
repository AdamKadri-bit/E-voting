/**
 * Non-cryptographic encodings shared by the ballot, board and verifier:
 * length-prefixed transcript hashing (identical to the PHP side) and the
 * human-friendly tracking-code format.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { PROTOCOL } from "./group";

/** SHA-256 over length-prefixed items — same framing as hashToScalar, hex out. */
export function hashItems(domain: string, items: string[]): string {
  const parts: Uint8Array[] = [];
  for (const s of [`${PROTOCOL}|${domain}`, ...items]) {
    const b = utf8ToBytes(s);
    const len = new Uint8Array(4);
    new DataView(len.buffer).setUint32(0, b.length, false);
    parts.push(len, b);
  }
  return bytesToHex(sha256(concatBytes(...parts)));
}

// Crockford base32: no I, L, O, U, so a code read aloud or copied by hand survives.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** First 80 bits of the tracking hash as 16 Crockford chars, grouped "XXXX-XXXX-XXXX-XXXX". */
export function shortTrackingCode(fullHex: string): string {
  const bytes = hexToBytes(fullHex).slice(0, 10);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{4}/g)!.join("-");
}

/** Normalises what a voter types (lowercase, spaces, O for 0…) back to the canonical short code. */
export function normaliseShortCode(input: string): string {
  const clean = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  return clean.length === 16 ? clean.match(/.{4}/g)!.join("-") : clean;
}
