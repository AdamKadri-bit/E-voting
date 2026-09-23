import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

/**
 * End-to-end tests run against an ISOLATED stack so they never touch the
 * developer's data: Laravel on :8002 with its own SQLite file (seeded fresh by
 * e2e/global-setup.ts) and a Vite dev server on :5174 pointed at it.
 */
export const BACKEND = resolve(import.meta.dirname, "../backend");
export const E2E_ENV = {
  APP_ENV: "local",
  DB_CONNECTION: "sqlite",
  DB_DATABASE: resolve(BACKEND, "database/e2e.sqlite"),
  FRONTEND_URL: "http://localhost:5174",
  EVOTE_DEMO_KEYFILE_DIR: resolve(BACKEND, "storage/app/e2e-keyfiles"),
  EVOTE_RATE_LOGIN: "100000",
  EVOTE_RATE_BALLOT: "100000",
  EVOTE_RATE_AUDIT: "100000",
  EVOTE_RATE_BOARD: "100000",
  EVOTE_RATE_EXPORT: "100000",
  EVOTE_RATE_REGISTER: "100000",
  PHP_CLI_SERVER_WORKERS: "8",
  // Concurrent workers + SQLite: WAL journal, a busy timeout, and a file cache
  // so rate-limiter writes don't contend with the database.
  DB_JOURNAL_MODE: "wal",
  DB_BUSY_TIMEOUT: "10000",
  CACHE_STORE: "file",
};

const phone = { ...devices["Pixel 7"], browserName: "chromium" as const };

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "../docs/e2e-results.json" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:5174",
    trace: "retain-on-failure",
    acceptDownloads: true,
  },
  projects: [
    { name: "desktop-1280", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    { name: "tablet-768x1024", use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, hasTouch: true } },
    { name: "tablet-1024x1366", use: { browserName: "chromium", viewport: { width: 1024, height: 1366 }, hasTouch: true } },
    { name: "phone-360x740", use: { ...phone, viewport: { width: 360, height: 740 } } },
    { name: "phone-390x844", use: { ...phone, viewport: { width: 390, height: 844 } } },
    { name: "phone-landscape-844x390", use: { ...phone, viewport: { width: 844, height: 390 } } },
  ],
  webServer: [
    {
      command: `php -S 127.0.0.1:8002 "${resolve(BACKEND, "vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php")}"`,
      cwd: resolve(BACKEND, "public"),
      env: E2E_ENV,
      url: "http://127.0.0.1:8002/up",
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "ignore",
    },
    {
      command: "npx vite --port 5174 --strictPort",
      env: { VITE_API_URL: "http://localhost:8002/api" },
      url: "http://localhost:5174",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
