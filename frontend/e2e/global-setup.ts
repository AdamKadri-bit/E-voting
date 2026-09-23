import { execSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BACKEND, E2E_ENV } from "../playwright.config";

/** Fresh, fully seeded e2e database before every run (never the dev database). */
export default function globalSetup() {
  writeFileSync(E2E_ENV.DB_DATABASE, "");
  rmSync(E2E_ENV.EVOTE_DEMO_KEYFILE_DIR, { recursive: true, force: true });
  execSync("php artisan migrate:fresh --seed --force", { cwd: BACKEND, env: { ...process.env, ...E2E_ENV }, stdio: "inherit" });
  void resolve;
}
