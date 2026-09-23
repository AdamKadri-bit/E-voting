import { test, expect } from "@playwright/test";
import { API, artisan, expectNoHorizontalScroll, expectTouchFriendly, login, shot } from "./helpers";

/**
 * Registry verification with the document the voter has. The OCR call is
 * mocked (Google Vision parsing is covered by the PHPUnit fixture tests); the
 * registry link that follows is real.
 */
test("voter verifies with a passport scan, or by typing their details", async ({ page }, info) => {
  artisan("demo:reset-voter-status newvoter@evoting.local --unlink");
  await login(page, "newvoter@evoting.local");
  await page.request.put(`${API}/me/voter-status`, { data: { voter_type: "diaspora", residence_country: "FR" } });

  await page.goto("/dashboard");
  await expect(page.getByText("Verify Voter Record").first()).toBeVisible();

  await page.goto("/verify-voter");
  // National ID asks for two photos, passport and ikhraj qayd for one, manual for none.
  await expect(page.locator("input[type=file]")).toHaveCount(2);
  await page.getByTestId("doc-ikhraj_qayd").click();
  await expect(page.locator("input[type=file]")).toHaveCount(1);
  await page.getByTestId("doc-passport").click();
  await expect(page.locator("input[type=file]")).toHaveCount(1);
  await shot(page, info, "60-verify-choose-document");
  await expectNoHorizontalScroll(page, "verify-voter");
  await expectTouchFriendly(page, "verify-voter");

  await page.route("**/api/ocr/document", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        document_type: "passport",
        data: { full_name: "Walid Newvoter", father_name: "", mother_name: "", date_of_birth: "1990-01-01", place_of_birth: "", national_id_number: "", civil_registry_number: "", governorate: "", district: "", locality: "", passport_number: "LR0000099" },
        missing: ["father_name", "mother_name"],
        warnings: ["Your father's or mother's name could not be read. Include the page facing the photo page (it shows the mother's name and registry number), or type them."],
      }),
    })
  );
  await page.locator("input[type=file]").setInputFiles({ name: "passport.jpg", mimeType: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  await page.getByTestId("extract").click();
  await expect(page.getByText("could not be read").first()).toBeVisible();
  await page.getByLabel("Father name").fill("Demo");
  await page.getByLabel("Mother name").fill("Demo Mother");
  await shot(page, info, "61-verify-passport-review");
  await page.getByRole("button", { name: /Confirm and verify/ }).click();
  await expect(page.getByText(/linked successfully/)).toBeVisible();

  // Manual path, from scratch.
  artisan("demo:reset-voter-status newvoter@evoting.local --unlink");
  await page.request.put(`${API}/me/voter-status`, { data: { voter_type: "diaspora", residence_country: "FR" } });
  await page.goto("/verify-voter");
  await page.getByTestId("doc-manual").click();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await page.getByLabel("Full name").fill("Walid Newvoter");
  await page.getByLabel("Father name").fill("Demo");
  await page.getByLabel("Mother name").fill("Demo Mother");
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await shot(page, info, "62-verify-manual");
  await page.getByRole("button", { name: /Confirm and verify/ }).click();
  await expect(page.getByText(/linked successfully/)).toBeVisible();

  // Leave the demo account as seeded: unlinked, status unset.
  artisan("demo:reset-voter-status newvoter@evoting.local --unlink");
});
