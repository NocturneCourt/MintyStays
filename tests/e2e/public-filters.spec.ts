import { expect, test } from "@playwright/test";

test("filters by listing type and trust tier", async ({ page }) => {
  await page.goto("/?score=&type=hotel&trustTier=editor_verified");

  await expect(page.getByRole("heading", { name: "Avenida Chill Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alfama Cool Loft" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Baixa Breeze Rooms" })).toHaveCount(0);
  await expect(page.locator(".pin")).toHaveCount(1);
});

test("filters by minimum Guest Signal score", async ({ page }) => {
  await page.goto("/?score=55&type=&trustTier=");

  await expect(page.getByRole("heading", { name: "Avenida Chill Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alfama Cool Loft" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Baixa Breeze Rooms" })).toHaveCount(0);
});

test("shows an empty state when filters remove every listing", async ({ page }) => {
  await page.goto("/?score=99&type=hotel&trustTier=handpicked");

  await expect(page.locator(".map-empty").first()).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(0);
});
