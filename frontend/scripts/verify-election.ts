/**
 * Independent election verifier — command-line edition.
 *
 *   npm run verify -- --api http://localhost:8001/api --election 8
 *   npm run verify -- --file board-export.json
 *
 * Downloads (or reads) the public bulletin-board export and re-checks every
 * ballot proof, the homomorphic tally, every trustee decryption proof and the
 * published results, using @noble — not the server's libsodium code.
 * Exit code 0 = PASS, 1 = FAIL, 2 = could not run.
 */
import { readFileSync } from "node:fs";
import { verifyBoard } from "../src/crypto/verifier";
import type { BoardExport } from "../src/crypto/board";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const file = arg("file");
  const api = arg("api") ?? "http://localhost:8001/api";
  const election = arg("election");
  let board: BoardExport;

  if (file) {
    board = JSON.parse(readFileSync(file, "utf8"));
  } else if (election) {
    const res = await fetch(`${api.replace(/\/$/, "")}/board/elections/${election}/export`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Board download failed: HTTP ${res.status}`);
    board = (await res.json()) as BoardExport;
  } else {
    console.error("Usage: npm run verify -- --election <id> [--api <url>]   |   --file <board.json>");
    process.exit(2);
  }

  const t0 = performance.now();
  const report = verifyBoard(board);
  const ms = Math.round(performance.now() - t0);

  console.log(`Election #${board.election.id}: ${board.election.title}`);
  console.log(`Public key ${board.election.joint_public_key}`);
  if (board.client_bundle) console.log(`Client crypto bundle ${board.client_bundle.file} sha256=${board.client_bundle.sha256}`);
  console.log("");
  for (const c of report.checks) {
    const tag = c.skipped ? "SKIP" : c.ok ? "PASS" : "FAIL";
    console.log(`${tag.padEnd(5)} ${c.name} — ${c.detail}`);
    for (const f of c.failures) console.log(`        · ${f}`);
  }
  console.log(`\nOVERALL: ${report.ok ? "PASS" : "FAIL"}  (${ms} ms)`);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(2);
});
