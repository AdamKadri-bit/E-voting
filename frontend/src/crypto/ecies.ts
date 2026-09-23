/**
 * Encrypting one trustee's polynomial share to another during the key ceremony.
 * ristretto255 Diffie–Hellman → HKDF-SHA256 → AES-256-GCM, all from @noble.
 * The server relays these blobs but holds no key that opens them.
 */
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { type Point, mul, mulBase, pointFromHex, pointToHex, randomScalar } from "./group";

export type SealedBox = { ephemeral: string; nonce: string; ciphertext: string };

function deriveKey(shared: Point, ephemeral: Point, info: string): Uint8Array {
  return hkdf(sha256, shared.toBytes(), ephemeral.toBytes(), utf8ToBytes(info), 32);
}

export function seal(recipient: Point, plaintext: Uint8Array, info: string): SealedBox {
  const e = randomScalar();
  const E = mulBase(e);
  const key = deriveKey(mul(recipient, e), E, info);
  const nonce = randomBytes(12);
  const ct = gcm(key, nonce, utf8ToBytes(info)).encrypt(plaintext);
  return { ephemeral: pointToHex(E), nonce: bytesToHex(nonce), ciphertext: bytesToHex(ct) };
}

export function open(secret: bigint, box: SealedBox, info: string): Uint8Array {
  const E = pointFromHex(box.ephemeral);
  const key = deriveKey(mul(E, secret), E, info);
  return gcm(key, hexToBytes(box.nonce), utf8ToBytes(info)).decrypt(hexToBytes(box.ciphertext));
}
