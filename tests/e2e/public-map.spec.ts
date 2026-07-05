import { expect, test } from "@playwright/test";

test("renders launch-city map, pins, and non-empty listing cards", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Lisbon", exact: true })).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(6);

  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon 5 Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Be Poet Baixa Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon Chillout Apartments" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "LSA Príncipe Real by Numa" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Charm Flats" })).toBeVisible();

  await expect(page.getByText("mixed AC reports")).toBeVisible();
  await expect(page.getByText("room AC was described as good")).toBeVisible();
  await expect(page.getByText("heatwave mention")).toBeVisible();
  await expect(page.getByText("unit had ample air conditioning")).toBeVisible();
});
