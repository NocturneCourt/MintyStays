import { expect, test } from "@playwright/test";

test("listing detail keeps Guest Signal and Editor Score separate", async ({ page }) => {
  await page.goto("/listings/avenida-chill-hotel-1");

  await expect(page.getByRole("heading", { name: "Avenida Chill Hotel" })).toBeVisible();
  await expect(page.getByText("Guest Signal").first()).toBeVisible();
  await expect(page.getByText("56/100")).toBeVisible();
  await expect(page.getByText("Editor Score").first()).toBeVisible();
  await expect(page.getByText("Verified Cold")).toBeVisible();
  await expect(page.getByText("never averaged into Guest Signal")).toBeVisible();
});

test("affiliate endpoint redirects to a tracked booking URL", async ({ request }) => {
  const response = await request.get("/api/affiliate-click?id=avenida-chill-hotel-1", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  const location = response.headers().location;
  expect(location).toContain("https://example.com/book/avenida-chill-hotel");
  expect(location).toContain("utm_source=mintystays");
  expect(location).toContain("utm_medium=affiliate");
});
