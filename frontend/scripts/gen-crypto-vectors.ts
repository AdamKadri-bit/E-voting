/**
 * Writes backend/tests/Fixtures/crypto-vectors.json from the TypeScript crypto,
 * so the PHP (libsodium) implementation is tested against the exact bytes the
 * browser produces. Run: npx tsx scripts/gen-crypto-vectors.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { hashToScalar, scalarToHex, pointFromHex, randomScalar, pointToHex, mulBase } from "../src/crypto/group";
import { encrypt, toJson } from "../src/crypto/elgamal";
import { encryptBallot, toAudited, trackingCode } from "../src/crypto/ballot";
import { selectionVector } from "../src/crypto/manifest";
import { sharePublicKey } from "../src/crypto/threshold";
import { sealKeyfile } from "../src/crypto/keyfile";
import { buildBoard, ceremony, makeManifest } from "../src/crypto/__tests__/simulate";

const m = makeManifest();
const c = ceremony(3, 2);
const votes = [
  { credential: "cred-a", list: 100, candidate: 500 },
  { credential: "cred-b", list: 101, candidate: 600 },
  { credential: "cred-a", list: 101, candidate: null },
  { credential: "cred-c", list: 100, candidate: 501 },
];
const board = buildBoard(c, m, votes, [1, 3]);
const H = pointFromHex(c.jointPk);

const good = encryptBallot(m, c.jointPk, "cred-x", selectionVector(m, 100, 501));
const overVote = structuredClone(good.ballot);
overVote.ciphertexts[0] = toJson(encrypt(1000, randomScalar(), H));
const two = encryptBallot(m, c.jointPk, "cred-x", selectionVector(m, 101, null)).ballot;
const twoLists = { ...good.ballot, ciphertexts: [good.ballot.ciphertexts[0], two.ciphertexts[1], ...good.ballot.ciphertexts.slice(2)], option_proofs: [good.ballot.option_proofs[0], two.option_proofs[1], ...good.ballot.option_proofs.slice(2)] };
const replayed = { ...good.ballot, credential: "cred-y" };

const corruptedAudit = toAudited(good.ballot, { ...good.secrets, selections: selectionVector(m, 101, 600) });

const kf = await sealKeyfile({ kind: "share", election_id: 7, trustee_index: 2 }, { share: c.shares.get(2) }, "demo passphrase 123", { t: 1, m: 256 });

const out = {
  generated_by: "frontend/scripts/gen-crypto-vectors.ts",
  hash_to_scalar: [
    { domain: "schnorr", items: ["a", "b"], out: scalarToHex(hashToScalar("schnorr", ["a", "b"])) },
    { domain: "range", items: [], out: scalarToHex(hashToScalar("range", [])) },
    { domain: "exact", items: ["ünïcødé", "", "x".repeat(300)], out: scalarToHex(hashToScalar("exact", ["ünïcødé", "", "x".repeat(300)])) },
  ],
  base_multiples: [1n, 2n, 5n, 12345678901234567890n].map((k) => ({ k: scalarToHex(k), p: pointToHex(mulBase(k)) })),
  manifest: m,
  ceremony: {
    round1: c.pubs,
    joint_public_key: c.jointPk,
    share_public_keys: c.pubs.map((p) => ({ index: p.trustee_index, key: pointToHex(sharePublicKey(c.pubs, p.trustee_index)) })),
  },
  ballots: {
    valid: { ballot: good.ballot, tracking: trackingCode(good.ballot) },
    over_vote: overVote,
    two_lists: twoLists,
    replayed_credential: replayed,
  },
  audits: { honest: toAudited(good.ballot, good.secrets), corrupted: corruptedAudit },
  board,
  keyfile: { file: kf, passphrase: "demo passphrase 123", plaintext: { share: c.shares.get(2) } },
};

const target = resolve(import.meta.dirname, "../../backend/tests/Fixtures/crypto-vectors.json");
writeFileSync(target, JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
console.log(`wrote ${target}`);
