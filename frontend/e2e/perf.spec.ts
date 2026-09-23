import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Manifest, ManifestConstraint, ManifestOption } from "../src/crypto/manifest";

/**
 * Crypto performance on a throttled CPU (Chrome DevTools 4× slowdown, the
 * standard "mid-range phone" setting). Encrypts a small real ballot and a
 * large synthetic one (11 lists × 8 candidates = 99 options, bigger than any
 * Lebanese constituency ballot).
 *
 * DevTools throttling applies to the page's main thread only — not to Web
 * Workers — so the CPU cost is measured by running the identical encryption on
 * the throttled main thread (what the worker would take on a 4× slower core),
 * and responsiveness is measured separately with the real worker.
 */
test("ballot encryption + proofs under 4x CPU throttling", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium" || !info.project.name.startsWith("phone-390"), "measured once, on the phone project");
  await page.goto("/login");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const result = await page.evaluate(async () => {
    const { runCrypto } = await import("/src/crypto/client.ts");
    const { encryptBallot } = await import("/src/crypto/ballot.ts");
    const { manifestHash } = await import("/src/crypto/manifest.ts");
    const { mulBase, randomScalar, pointToHex } = await import("/src/crypto/group.ts");
    const pk = pointToHex(mulBase(randomScalar()));

    function manifest(lists: number, cands: number) {
      const options: ManifestOption[] = [];
      for (let l = 0; l < lists; l++) options.push({ type: "list", id: 100 + l, list_id: null, label: `List ${l}` });
      const byList: number[][] = [];
      for (let l = 0; l < lists; l++) {
        byList[l] = [];
        for (let c = 0; c < cands; c++) {
          byList[l].push(options.length);
          options.push({ type: "candidate", id: 1000 + l * 100 + c, list_id: 100 + l, label: `C${l}.${c}` });
        }
      }
      const constraints: ManifestConstraint[] = [{ type: "exact", value: 1, indices: [...Array(lists).keys()], parent: null }];
      if (cands) constraints.push({ type: "max", value: 1, indices: byList.flat(), parent: null });
      byList.forEach((idx, l) => idx.length && constraints.push({ type: "implies", value: 1, indices: idx, parent: l }));
      const m = { id: 1, election_id: 1, constituency_id: 1, district_id: 1, options, constraints, hash: "" } as Manifest;
      m.hash = manifestHash(m);
      return m;
    }

    const out: Record<string, unknown> = {};
    await runCrypto("warmup");
    encryptBallot(manifest(2, 1), pk, "warm", [1, 0, 0, 0]);
    for (const [name, lists, cands] of [["demo-ballot-3x2", 3, 2], ["large-ballot-11x8", 11, 8]] as const) {
      const m = manifest(lists, cands);
      const sel = m.options.map((o, i) => (i === 0 || (o.type === "candidate" && o.list_id === 100 && o.id === 1000) ? 1 : 0));
      const throttled: number[] = [];
      const worker: number[] = [];
      for (let r = 0; r < 3; r++) {
        let t0 = performance.now();
        encryptBallot(m, pk, "perf", sel); // throttled main thread = slow-phone CPU cost
        throttled.push(Math.round(performance.now() - t0));
        t0 = performance.now();
        await runCrypto("encryptBallot", { manifest: m, jointPk: pk, credential: "perf", selections: sel });
        worker.push(Math.round(performance.now() - t0));
      }
      const med = (a: number[]) => [...a].sort((x, y) => x - y)[1];
      out[name] = {
        options: m.options.length,
        constraints: m.constraints.length,
        throttled_cpu_runs_ms: throttled,
        throttled_cpu_median_ms: med(throttled),
        unthrottled_worker_runs_ms: worker,
        unthrottled_worker_median_ms: med(worker),
      };
    }
    // Main-thread responsiveness while the worker encrypts: longest gap between animation frames.
    const m = manifest(11, 8);
    let last = performance.now();
    let worst = 0;
    let running = true;
    const tick = () => {
      const now = performance.now();
      worst = Math.max(worst, now - last);
      last = now;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await runCrypto("encryptBallot", { manifest: m, jointPk: pk, credential: "perf", selections: m.options.map((_, i) => (i === 0 ? 1 : 0)) });
    running = false;
    out.main_thread_longest_frame_gap_ms = Math.round(worst);
    return out;
  });

  const record = { measured_at: new Date().toISOString(), cpu_throttling: "4x (Chrome DevTools)", viewport: info.project.name, host: process.platform, ...result };
  const dir = resolve(import.meta.dirname, "../../docs/perf");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "mobile-crypto.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(JSON.stringify(record, null, 2));
  expect(result["demo-ballot-3x2"].throttled_cpu_median_ms).toBeLessThan(3000);
  expect(result["large-ballot-11x8"].throttled_cpu_median_ms).toBeLessThan(3000);
  void existsSync; void readFileSync;
});
