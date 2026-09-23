/**
 * Passphrase-encrypted trustee key files: Argon2id → AES-256-GCM (@noble).
 *
 * The file never leaves the trustee's machine unencrypted and the server never
 * receives it at all; losing it (or the passphrase) is survivable as long as k
 * of the n trustees keep theirs. Argon2id is RFC 9106 v1.3, so the PHP side can
 * read and write the same files through libsodium's crypto_pwhash (used only by
 * the demo seeder and tests).
 */
import { gcm } from "@noble/ciphers/aes.js";
import { argon2idAsync } from "@noble/hashes/argon2.js";
import { bytesToHex, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

export type KeyfileKind = "ceremony" | "share";

export type KeyfileMeta = {
  format: "evote-keyfile-v1";
  kind: KeyfileKind;
  election_id: number;
  trustee_index: number;
  created_at: string;
};

export type KdfParams = { name: "argon2id"; t: number; m: number; p: 1; salt: string };

export type Keyfile = {
  meta: KeyfileMeta;
  kdf: KdfParams;
  cipher: { name: "aes-256-gcm"; nonce: string };
  ciphertext: string;
};

/** RFC 9106 second recommended option: t=3, 64 MiB. Tests pass lighter params. */
export const DEFAULT_KDF = { t: 3, m: 65536 };

export const MIN_PASSPHRASE = 12;

async function derive(passphrase: string, kdf: Omit<KdfParams, "name">, onProgress?: (p: number) => void) {
  return argon2idAsync(utf8ToBytes(passphrase), hexToBytes(kdf.salt), { t: kdf.t, m: kdf.m, p: 1, dkLen: 32, onProgress });
}

/** AAD is the canonical meta string, so relabelling a file (other election/trustee) breaks it. */
const metaAad = (m: KeyfileMeta) =>
  utf8ToBytes([m.format, m.kind, m.election_id, m.trustee_index, m.created_at].join("|"));

export async function sealKeyfile(
  meta: Omit<KeyfileMeta, "format" | "created_at">,
  secret: unknown,
  passphrase: string,
  cost = DEFAULT_KDF,
  onProgress?: (p: number) => void
): Promise<Keyfile> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
  const fullMeta: KeyfileMeta = { format: "evote-keyfile-v1", kind: meta.kind, election_id: meta.election_id, trustee_index: meta.trustee_index, created_at: new Date().toISOString() };
  const kdf: KdfParams = { name: "argon2id", t: cost.t, m: cost.m, p: 1, salt: bytesToHex(randomBytes(16)) };
  const nonce = randomBytes(12);
  const key = await derive(passphrase, kdf, onProgress);
  const ct = gcm(key, nonce, metaAad(fullMeta)).encrypt(utf8ToBytes(JSON.stringify(secret)));
  return { meta: fullMeta, kdf, cipher: { name: "aes-256-gcm", nonce: bytesToHex(nonce) }, ciphertext: bytesToHex(ct) };
}

/** Throws "Wrong passphrase or damaged file." on any authentication failure. */
export async function openKeyfile<T>(file: Keyfile, passphrase: string, onProgress?: (p: number) => void): Promise<T> {
  if (file?.meta?.format !== "evote-keyfile-v1" || file?.kdf?.name !== "argon2id") throw new Error("Not an e-voting key file.");
  if (file.kdf.m > 1 << 21 || file.kdf.t > 20) throw new Error("Key file asks for unreasonable KDF cost.");
  const key = await derive(passphrase, file.kdf, onProgress);
  try {
    const pt = gcm(key, hexToBytes(file.cipher.nonce), metaAad(file.meta)).decrypt(hexToBytes(file.ciphertext));
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    throw new Error("Wrong passphrase or damaged file.");
  }
}
