import { test, expect } from "@playwright/test";
import { API, artisan, electionId, expectNoHorizontalScroll, login, shot } from "./helpers";

/**
 * A brand-new account (no seeded voter profile) signs up, verifies against
 * the registry as one of the fictional Zahle testers, gets its voter profile
 * from that record, and votes in the Zahle demo election.
 */
test("new account verifies as a Zahle tester and votes in Zahle", async ({ page, request }, info) => {
  const email = `zahle-${info.project.name}@testers.local`;
  artisan(`tinker --execute='App\\Models\\User::where("email","${email}")->delete();'`);
  const reg = await request.post(`${API}/auth/register`, { data: { name: "Zahle Tester", email, password: "Password123!" }, headers: { Accept: "application/json" } });
  expect(reg.ok()).toBeTruthy();
  artisan(`tinker --execute='App\\Models\\User::where("email","${email}")->update(["email_verified_at"=>now()]);'`);

  await login(page, email);
  await expect(page).toHaveURL(/dashboard/); // no voter profile yet → no status step
  await page.getByText("Verify Voter Record").first().click();
  await page.getByTestId("doc-manual").click();
  await page.getByLabel("Full name").fill("Omar Chehab");
  await page.getByLabel("Father name").fill("Walid");
  await page.getByLabel("Mother name").fill("Lina Karam");
  await page.getByLabel("Date of birth").fill("1989-06-21");
  await page.getByRole("button", { name: /Confirm and verify/ }).click();
  await expect(page.getByText(/linked successfully/)).toBeVisible();

  // Now a voter: the status step comes first.
  await page.goto("/elections");
  await expect(page).toHaveURL(/voter-status/);
  await page.getByTestId("status-resident").click();
  await page.getByTestId("status-save").click();

  const id = await electionId(request, "2026 Zahle Election");
  await page.goto("/elections");
  await page.getByTestId(`vote-${id}`).click();
  await expect(page.getByText("Zahle").first()).toBeVisible();
  await page.locator("[data-testid^=list-]").first().click();
  await shot(page, info, "70-zahle-ballot");
  await expectNoHorizontalScroll(page, "zahle ballot");
  await page.getByTestId("encrypt").click();
  await page.getByTestId("cast").click();
  await expect(page.getByTestId("receipt-status")).toHaveText("counted");
  await shot(page, info, "71-zahle-receipt");

  // Free the tester identity for the next run.
  artisan(`tinker --execute='App\\Models\\User::where("email","${email}")->delete();'`);
});
