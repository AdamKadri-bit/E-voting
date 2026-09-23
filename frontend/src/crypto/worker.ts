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
import { errorMessage } from "../lib/errors";

type P<F extends (...args: never[]) => unknown, I extends number> = Parameters<F>[I];
type Progress = (p: number, label?: string) => void;
type Msg = { id: number; op: string; args: unknown };

const ops = {
  /** Warms noble's precomputed tables so the first real encryption isn't the slow one. */
  warmup: () => {
    mulBase(randomScalar());
    G.multiply(2n);
    return true;
  },
  encryptBallot: (
    { manifest, jointPk, credential, selections }: { manifest: P<typeof encryptBallot, 0>; jointPk: string; credential: string; selections: number[] },
    progress: Progress
  ) => {
    const t0 = performance.now();
    const out = encryptBallot(manifest, jointPk, credential, selections, (d, t) => progress(d / t));
    return { ...out, tracking: trackingCode(out.ballot), ms: Math.round(performance.now() - t0) };
  },
  auditBallot: ({ manifest, jointPk, ballot, secrets }: { manifest: P<typeof verifyAudit, 0>; jointPk: string; ballot: P<typeof toAudited, 0>; secrets: P<typeof toAudited, 1> }) => {
    const audit = toAudited(ballot, secrets);
    return { audit, check: verifyAudit(manifest, jointPk, audit) };
  },
  sealKeyfile: ({ meta, secret, passphrase, cost }: { meta: P<typeof sealKeyfile, 0>; secret: unknown; passphrase: string; cost?: P<typeof sealKeyfile, 3> }, progress: Progress) =>
    sealKeyfile(meta, secret, passphrase, cost, (p) => progress(p, "Protecting key file")),
  openKeyfile: ({ file, passphrase }: { file: Keyfile; passphrase: string }, progress: Progress) =>
    openKeyfile(file, passphrase, (p) => progress(p, "Unlocking key file")),
  round1: ({ electionId, index, threshold }: { electionId: number; index: number; threshold: number }) => round1(electionId, index, threshold),
  round2: ({ electionId, index, secret, others }: { electionId: number; index: number; secret: P<typeof round2, 2>; others: P<typeof round2, 3> }) =>
    round2(electionId, index, secret, others),
  round3: ({ electionId, index, secret, all, incoming }: { electionId: number; index: number; secret: P<typeof round3, 2>; all: P<typeof round3, 3>; incoming: P<typeof round3, 4> }) =>
    round3(electionId, index, secret, all, incoming),
  partialDecrypt: ({ electionId, index, share, aggregates }: { electionId: number; index: number; share: string; aggregates: P<typeof partialDecrypt, 3> }) =>
    partialDecrypt(electionId, index, share, aggregates),
  verifyBoard: ({ board }: { board: P<typeof verifyBoard, 0> }, progress: Progress) =>
    verifyBoard(board, (stage, done, total) => progress(done / total, stage === "ballots" ? "Checking ballot proofs" : "Checking decryption proofs")),
};

type Op = (args: unknown, progress: Progress) => unknown;

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { id, op, args } = e.data;
  const progress: Progress = (p, label) => self.postMessage({ id, progress: p, label });
  try {
    const fn = (ops as Record<string, Op>)[op];
    if (!fn) throw new Error(`Unknown crypto op ${op}`);
    const result = await fn(args, progress);
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: errorMessage(err) });
  }
};
