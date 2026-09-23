import { test } from "@playwright/test";
import { adminLogin, electionId, expectNoHorizontalScroll, expectTouchFriendly, login, shot } from "./helpers";

/** System-wide responsive audit: every page, every viewport project. */
test.describe("responsive audit", () => {
  test("public and voter pages", async ({ page, request }, info) => {
    const open = await electionId(request, "2026 Parliamentary Election");
    for (const [name, url] of [["30-login", "/login"], ["31-signup", "/signup"], ["32-guest-dashboard", "/dashboard"], ["33-board-index", "/board"], ["34-verifier", "/verify"]] as const) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await shot(page, info, name);
      await expectNoHorizontalScroll(page, url);
      await expectTouchFriendly(page, url);
    }
    await login(page, "resident@evoting.local");
    for (const [name, url] of [["35-dashboard", "/dashboard"], ["36-profile", "/profile"], ["37-elections", "/elections"], ["38-ballot", `/elections/${open}/ballot`], ["39-verify-voter", "/verify-voter"], ["40-legacy-receipt-check", "/verify/receipt"]] as const) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      await shot(page, info, name);
      await expectNoHorizontalScroll(page, url);
      await expectTouchFriendly(page, url);
    }
  });

  test("admin pages", async ({ page, request }, info) => {
    const open = await electionId(request, "2026 Parliamentary Election");
    await adminLogin(page);
    for (const [name, url] of [["50-admin-overview", "/admin"], ["51-admin-elections", "/admin/elections"], ["52-admin-election-detail", `/admin/elections/${open}`], ["53-admin-results", "/admin/results"], ["54-trustee-home", "/trustee"]] as const) {
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      if (url === "/admin") {
        const opener = page.getByText("2026 Parliamentary Election (Demo)").first();
        if (await opener.isVisible()) await opener.click();
        await page.waitForTimeout(1500);
      }
      await shot(page, info, name);
      await expectNoHorizontalScroll(page, url);
      await expectTouchFriendly(page, url);
    }
  });
});
