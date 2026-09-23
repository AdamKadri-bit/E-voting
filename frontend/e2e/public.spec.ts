import { test, expect } from "@playwright/test";
import { electionId, expectNoHorizontalScroll, expectTouchFriendly, shot } from "./helpers";

test.describe("public pages", () => {
  test("live turnout + world map, declared/detected toggle, table fallback", async ({ page, request }, info) => {
    const id = await electionId(request, "2026 Parliamentary Election");
    await page.goto(`/results/${id}`);
    await expect(page.getByTestId("turnout-panel")).toBeVisible();
    await expect(page.getByTestId("results")).toHaveCount(0); // no results while open
    await expect(page.getByTestId("country-table")).toContainText("France");
    await shot(page, info, "11-turnout-map");
    await expectNoHorizontalScroll(page, "turnout");

    // Tap/click a country dot for its tooltip.
    const dot = page.locator("svg[role=img] circle").first();
    await dot.dispatchEvent("pointerup", { pointerType: "touch" });
    await expect(page.getByTestId("map-tooltip")).toBeVisible();
    await shot(page, info, "12-map-tooltip");

    await page.getByRole("radio", { name: "Detected (IP) country" }).click();
    await expect(page.getByText(/only indicative/)).toBeVisible();
    await page.getByRole("button", { name: "Table", exact: true }).click();
    await shot(page, info, "13-turnout-table-detected");
  });

  test("published results carry a Verified badge earned in the browser", async ({ page, request }, info) => {
    const id = await electionId(request, "2025 Municipal Pilot");
    await page.goto(`/results/${id}`);
    await expect(page.getByTestId("results")).toBeVisible();
    await expect(page.getByTestId("verified-badge")).toHaveAttribute("data-state", "pass", { timeout: 60_000 });
    await shot(page, info, "14-results-verified");
    await expectNoHorizontalScroll(page, "results");
  });

  test("bulletin board lists ballots and finds a tracking code", async ({ page, request }, info) => {
    const id = await electionId(request, "2025 Municipal Pilot");
    const page1 = await (await request.get(`http://localhost:8002/api/board/elections/${id}/ballots`)).json();
    const code = page1.data[0].short_code;
    await page.goto(`/board/${id}?code=${code}`);
    await expect(page.getByTestId("lookup-result")).toContainText(code);
    await expect(page.getByTestId("joint-key")).not.toBeEmpty();
    await page.locator("[data-testid=board-rows] details").first().click();
    await shot(page, info, "15-bulletin-board");
    await expectNoHorizontalScroll(page, "board");
    await expectTouchFriendly(page, "board");
  });

  test("independent verifier passes the published election", async ({ page, request }, info) => {
    const id = await electionId(request, "2025 Municipal Pilot");
    await page.goto(`/verify?election=${id}`);
    await expect(page.getByTestId("verifier-report")).toHaveAttribute("data-ok", "true", { timeout: 90_000 });
    await expect(page.locator("[data-check=decryption]")).toHaveAttribute("data-ok", "true");
    await shot(page, info, "16-verifier-pass");
    await expectNoHorizontalScroll(page, "verifier");
  });
});
