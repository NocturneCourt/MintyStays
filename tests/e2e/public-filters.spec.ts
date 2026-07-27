import { expect, test } from "@playwright/test";

test("filters by listing type and trust tier", async ({ page }) => {
  await page.goto("/?score=&type=hotel&trustTier=");

  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon 5 Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Be Poet Baixa Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon Chillout Apartments" })).toHaveCount(0);
  await expect(page.locator(".pin")).toHaveCount(3);
});

test("filters by minimum Guest Signal score", async ({ page }) => {
  // Launch seed Art Stay scores in the mid-60s; require a higher bar for empty state.
  await page.goto("/?score=90&type=&trustTier=");

  await expect(page.locator(".map-empty").first()).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(0);
});

test("shows scored listings when minimum Guest Signal is met", async ({ page }) => {
  await page.goto("/?score=50&type=&trustTier=");

  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.locator(".pin").first()).toBeVisible();
});

test("shows an empty state when filters remove every listing", async ({ page }) => {
  await page.goto("/?score=99&type=hotel&trustTier=handpicked");

  await expect(page.locator(".map-empty").first()).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(0);
});
