import { expect, type Page, type TestInfo, type APIRequestContext } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { BACKEND, E2E_ENV } from "../playwright.config";

export const API = "http://localhost:8002/api";

export function artisan(cmd: string): string {
  return execSync(`php artisan ${cmd}`, { cwd: BACKEND, env: { ...process.env, ...E2E_ENV } }).toString();
}

/** Screenshot into docs/screenshots/<project>/<name>.png (full page). */
export async function shot(page: Page, info: TestInfo, name: string) {
  const dir = resolve(import.meta.dirname, "../../docs/screenshots", info.project.name);
  mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

/** No sideways page scroll: the document never grows wider than the viewport. */
export async function expectNoHorizontalScroll(page: Page, where: string) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(r.sw, `horizontal overflow on ${where}: ${r.sw} > ${r.cw}`).toBeLessThanOrEqual(r.cw + 1);
}

/** Visible form fields use ≥16px text (iOS zoom) and visible buttons are ≥44px tall. */
export async function expectTouchFriendly(page: Page, where: string) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]), select, textarea").forEach((el) => {
      if (visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16) out.push(`font<16px: ${(el as HTMLInputElement).name || el.getAttribute("placeholder") || el.tagName}`);
    });
    document.querySelectorAll("button, a.govBtn, a.gv-btn, [role=button]").forEach((el) => {
      if (visible(el) && el.getBoundingClientRect().height < 43.5) out.push(`target<44px: ${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}`);
    });
    return out;
  });
  expect(bad, `touch/readability problems on ${where}`).toEqual([]);
}

export async function login(page: Page, email: string, password = "Password123!") {
  await page.goto("/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/(dashboard|voter-status)/);
}

export async function adminLogin(page: Page, email = "admin@evoting.local", password = "Admin123!") {
  await page.goto("/admin/login");
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /Sign in to admin panel/ }).click();
  await page.waitForURL(/\/admin$/);
}

export async function apiAdmin(request: APIRequestContext) {
  const r = await request.post(`${API}/auth/login`, { data: { email: "admin@evoting.local", password: "Admin123!" }, headers: { Accept: "application/json" } });
  expect(r.ok()).toBeTruthy();
}

export async function electionId(request: APIRequestContext, titleStart: string): Promise<number> {
  const r = await request.get(`${API}/board/elections`);
  const e = (await r.json()).elections.find((x: any) => x.title.startsWith(titleStart));
  expect(e, `election "${titleStart}"`).toBeTruthy();
  return e.id;
}
