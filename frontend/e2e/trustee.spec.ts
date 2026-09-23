import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import { API, apiAdmin, artisan, expectNoHorizontalScroll, login, shot } from "./helpers";

const PASS = "trustee e2e passphrase";

async function trustee(browser: Browser, email: string, password: string, adminPortal: boolean, baseURL: string) {
  const ctx = await browser.newContext({ baseURL, acceptDownloads: true });
  const page = await ctx.newPage();
  if (adminPortal) {
    await page.goto("/admin/login");
    await page.getByPlaceholder("name@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill(password);
    await page.getByRole("button", { name: /Sign in to admin panel/ }).click();
    await page.waitForURL(/\/admin$/);
  } else {
    await login(page, email, password);
  }
  return page;
}

async function download(page: Page, action: () => Promise<void>): Promise<string> {
  const [dl] = await Promise.all([page.waitForEvent("download"), action()]);
  const path = await dl.path();
  return path!;
}

test("trustee key ceremony and decryption ceremony, end to end", async ({ browser, request, page }, info) => {
  test.setTimeout(420_000);
  const baseURL = info.project.use.baseURL as string;
  const { id } = JSON.parse(artisan("demo:ceremony-election --json").trim().split("\n").pop()!);

  const t = [
    await trustee(browser, "admin@evoting.local", "Admin123!", true, baseURL),
    await trustee(browser, "kassem@evoting.local", "Trustee123!", false, baseURL),
    await trustee(browser, "officer@evoting.local", "Admin123!", true, baseURL),
  ];
  // Pages sized like this project's viewport, so the ceremony UI is exercised on phones too.
  for (const p of t) await p.setViewportSize(info.project.use.viewport ?? { width: 1280, height: 800 });

  // Round 1 — each trustee generates in their own browser and downloads a ceremony file.
  for (const [i, p] of t.entries()) {
    await p.goto(`/trustee/elections/${id}/keys`);
    await p.getByTestId("ceremony-pass").fill(PASS);
    await p.getByTestId("ceremony-pass2").fill(PASS);
    if (i === 1) await shot(p, info, "20-key-ceremony-round1");
    await download(p, () => p.getByTestId("round1-go").click());
  }

  // Round 2 — seal shares to each other trustee (secrets still in the tab's memory).
  for (const p of t) {
    await expect(p.getByTestId("round2")).toBeVisible({ timeout: 20_000 });
    await p.getByTestId("ceremony-continue").click();
  }

  // Round 3 — open/check shares, save the decryption share, prove the backup opens, confirm.
  const shareFiles: string[] = [];
  for (const [i, p] of t.entries()) {
    await expect(p.getByTestId("round3")).toBeVisible({ timeout: 20_000 });
    await p.getByTestId("ceremony-pass").fill(PASS);
    await p.getByTestId("ceremony-pass2").fill(PASS);
    const file = await download(p, () => p.getByTestId("ceremony-continue").click());
    shareFiles.push(file);
    await expect(p.getByTestId("backup")).toBeVisible();
    // Finishing is impossible until the backup has been re-opened.
    await expect(p.getByTestId("round3-finish")).toBeDisabled();
    await p.getByTestId("keyfile-input").setInputFiles({ name: "share.evkey", mimeType: "application/json", buffer: readFileSync(file) });
    await p.getByTestId("keyfile-pass").fill(PASS);
    await p.getByTestId("keyfile-unlock").click();
    await p.getByTestId("backup-ack").check();
    if (i === 1) await shot(p, info, "21-key-ceremony-backup");
    await p.getByTestId("round3-finish").click();
  }
  await expect(t[2].getByTestId("ceremony-complete")).toBeVisible({ timeout: 20_000 });
  await shot(t[1], info, "22-key-ceremony-complete");
  await expectNoHorizontalScroll(t[1], "key ceremony");

  // Admin opens polling; a resident votes; admin closes polling.
  await apiAdmin(request);
  expect((await request.patch(`${API}/admin/elections/${id}/status`, { data: { status: "active" } })).ok()).toBeTruthy();
  await login(page, "resident@evoting.local");
  await page.goto(`/elections/${id}/ballot`);
  await page.locator("[data-testid^=list-]").first().click();
  await page.getByTestId("encrypt").click();
  await page.getByTestId("cast").click();
  await expect(page.getByTestId("receipt-status")).toHaveText("counted");
  expect((await request.patch(`${API}/admin/elections/${id}/status`, { data: { status: "closed" } })).ok()).toBeTruthy();

  // Decryption ceremony with exactly k = 2 trustees (1 and 3).
  for (const i of [0, 2]) {
    const p = t[i];
    await p.goto(`/trustee/elections/${id}/decrypt`);
    await p.getByTestId("keyfile-input").setInputFiles({ name: "share.evkey", mimeType: "application/json", buffer: readFileSync(shareFiles[i]) });
    await p.getByTestId("keyfile-pass").fill(PASS);
    if (i === 2) await shot(p, info, "23-decryption-ceremony");
    await p.getByTestId("keyfile-unlock").click();
    await expect(p.getByTestId("partial-accepted")).toBeVisible();
  }
  await t[2].reload();
  await expect(t[2].getByTestId("decrypt-published")).toBeVisible();

  // The independent verifier accepts the whole run.
  await page.goto(`/verify?election=${id}`);
  await expect(page.getByTestId("verifier-report")).toHaveAttribute("data-ok", "true", { timeout: 90_000 });
  await shot(page, info, "24-verifier-after-ceremony");
  for (const p of t) await p.context().close();
});
