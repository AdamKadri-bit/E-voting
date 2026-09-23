/// <reference lib="webworker" />
/**
 * Crypto Web Worker: every expensive operation (ballot encryption + proofs,
 * key-file KDF, trustee rounds, partial decryption, full-board verification)
 * runs here so the page stays responsive on low-end phones. The worker is its
 * own bundle chunk; its SHA-256 is what the bulletin board publishes.
 */
import { encryptBallot, toAudited, verifyAudit, trackingCode } from "./ballot";
import { openKeyfile, sealKeyfile, type Keyfile } from "./keyfile";
import { partialDecrypt, round1, round2, round3 } from "./threshold";
import { verifyBoard } from "./verifier";
import { G, mulBase, randomScalar } from "./group";

type Msg = { id: number; op: string; args: any };

const ops: Record<string, (args: any, progress: (p: number, label?: string) => void) => unknown> = {
  /** Warms noble's precomputed tables so the first real encryption isn't the slow one. */
  warmup: () => {
    mulBase(randomScalar());
    G.multiply(2n);
    return true;
  },
  encryptBallot: ({ manifest, jointPk, credential, selections }, progress) => {
    const t0 = performance.now();
    const out = encryptBallot(manifest, jointPk, credential, selections, (d, t) => progress(d / t));
    return { ...out, tracking: trackingCode(out.ballot), ms: Math.round(performance.now() - t0) };
  },
  auditBallot: ({ manifest, jointPk, ballot, secrets }) => {
    const audit = toAudited(ballot, secrets);
    return { audit, check: verifyAudit(manifest, jointPk, audit) };
  },
  sealKeyfile: ({ meta, secret, passphrase, cost }, progress) => sealKeyfile(meta, secret, passphrase, cost, (p) => progress(p, "Protecting key file")),
  openKeyfile: ({ file, passphrase }, progress) => openKeyfile(file as Keyfile, passphrase, (p) => progress(p, "Unlocking key file")),
  round1: ({ electionId, index, threshold }) => round1(electionId, index, threshold),
  round2: ({ electionId, index, secret, others }) => round2(electionId, index, secret, others),
  round3: ({ electionId, index, secret, all, incoming }) => round3(electionId, index, secret, all, incoming),
  partialDecrypt: ({ electionId, index, share, aggregates }) => partialDecrypt(electionId, index, share, aggregates),
  verifyBoard: ({ board }, progress) =>
    verifyBoard(board, (stage, done, total) => progress(done / total, stage === "ballots" ? "Checking ballot proofs" : "Checking decryption proofs")),
};

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, op, args } = e.data;
  const progress = (p: number, label?: string) => (self as any).postMessage({ id, progress: p, label });
  try {
    const fn = ops[op];
    if (!fn) throw new Error(`Unknown crypto op ${op}`);
    const result = await fn(args, progress);
    (self as any).postMessage({ id, result });
  } catch (err: any) {
    (self as any).postMessage({ id, error: err?.message ?? String(err) });
  }
};
