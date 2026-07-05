import { expect, test } from "@playwright/test";

test("renders launch-city map, pins, and non-empty listing cards", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Lisbon", exact: true })).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(6);

  await expect(page.getByRole("heading", { name: "Avenida Chill Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alfama Cool Loft" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Baixa Breeze Rooms" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon Chillout Apartments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "LSA Príncipe Real by Numa" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Charm Flats" })).toBeVisible();

  await expect(page.getByText("Multiple recent guests describe rooms cooling")).toBeVisible();
  await expect(page.getByText("Seed evidence points to a dedicated split unit")).toBeVisible();
  await expect(page.getByText("Early evidence is limited")).toBeVisible();
  await expect(page.getByText("Public Booking review snippets include two")).toBeVisible();
});
