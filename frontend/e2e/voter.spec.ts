import { test, expect } from "@playwright/test";
import { artisan, expectNoHorizontalScroll, expectTouchFriendly, login, shot, API, electionId } from "./helpers";

test.describe("voters", () => {
  test("new voter must choose resident/diaspora right after sign-in", async ({ page }, info) => {
    artisan("demo:reset-voter-status newvoter@evoting.local");
    await login(page, "newvoter@evoting.local");
    await expect(page).toHaveURL(/voter-status/);
    await shot(page, info, "01-status-prompt");
    await expectNoHorizontalScroll(page, "status");
    await expectTouchFriendly(page, "status");

    await page.getByTestId("status-diaspora").click();
    const box = page.getByRole("combobox");
    await box.fill("can");
    await page.getByRole("option", { name: /Canada/ }).click();
    await expect(box).toHaveValue("Canada");
    await shot(page, info, "02-status-diaspora-country");
    await page.getByTestId("status-save").click();
    await page.waitForURL(/dashboard/);
    await expect(page.getByText("Voter status: Diaspora · Canada", { exact: true })).toBeVisible();
    await shot(page, info, "03-dashboard");
    await expectNoHorizontalScroll(page, "dashboard");
  });

  test("resident casts an encrypted ballot and gets a receipt", async ({ page, request }, info) => {
    const id = await electionId(request, "2026 Parliamentary Election");
    await login(page, "resident@evoting.local");
    await page.goto("/elections");
    await expect(page.getByTestId(`election-${id}`)).toBeVisible();
    await shot(page, info, "04-elections");
    await expectNoHorizontalScroll(page, "elections");

    await page.getByTestId(`vote-${id}`).click();
    await expect(page.getByTestId("diaspora-banner")).toHaveCount(0);
    await page.locator("[data-testid^=list-]").first().click();
    await page.locator("[data-testid^=cand-]").nth(1).click();
    await shot(page, info, "05-resident-ballot");
    await expectNoHorizontalScroll(page, "ballot");
    await expectTouchFriendly(page, "ballot");

    await page.getByTestId("encrypt").click();
    await expect(page.getByTestId("cast")).toBeVisible();
    // Cast and Audit stay pinned to the bottom of the screen.
    const pos = await page.getByTestId("cast").evaluate((el) => getComputedStyle(el.closest(".gv-sticky-actions")!).position);
    expect(["sticky", "static"]).toContain(pos);
    await shot(page, info, "06-cast-or-audit");

    await page.getByTestId("cast").click();
    await page.waitForURL(/receipt/);
    await expect(page.getByTestId("receipt-status")).toHaveText("counted");
    await shot(page, info, "07-receipt");
    await expectNoHorizontalScroll(page, "receipt");
  });

  test("diaspora voter confirms details, audits, re-encrypts and casts", async ({ page, request }, info) => {
    const id = await electionId(request, "2026 Parliamentary Election");
    await login(page, "diaspora@evoting.local");
    await page.goto(`/elections/${id}/ballot`);
    await expect(page.getByTestId("diaspora-banner")).toContainText("France");
    await shot(page, info, "08-diaspora-confirm");
    await page.getByTestId("confirm-details").click();

    await page.locator("[data-testid^=list-]").nth(1).click();
    await page.getByTestId("encrypt").click();
    const firstCode = (await page.getByTestId("tracking-code").textContent())!.trim();

    await page.getByTestId("audit").click();
    await expect(page.getByTestId("audit-result")).toHaveAttribute("data-ok", "true");
    await shot(page, info, "09-audit-passed");

    // The spoiled ballot is on the board as audited, and a fresh encryption gets a new code.
    const lookup = await request.get(`${API}/board/elections/${id}/lookup/${firstCode}`);
    expect((await lookup.json()).status).toBe("audited");
    await page.getByTestId("reencrypt").click();
    await page.getByTestId("encrypt").click();
    const second = (await page.getByTestId("tracking-code").textContent())!.trim();
    expect(second).not.toBe(firstCode);
    await page.getByTestId("cast").click();
    await expect(page.getByTestId("receipt-status")).toHaveText("counted");
  });

  test("diaspora voter sees a clear message when diaspora voting is disabled", async ({ page, request }, info) => {
    const id = await electionId(request, "Municipal Run-off");
    await login(page, "diaspora@evoting.local");
    await page.goto(`/elections/${id}/ballot`);
    await expect(page.getByTestId("ballot-error")).toHaveAttribute("data-reason", "diaspora_disabled");
    await shot(page, info, "10-diaspora-disabled");
  });
});
