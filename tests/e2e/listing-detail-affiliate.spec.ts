import { expect, test } from "@playwright/test";

test("listing detail keeps Guest Signal and Editor Score separate", async ({ page }) => {
  await page.goto("/listings/lisbon-art-stay-hotel-apartments-1");

  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.getByText("Guest Signal").first()).toBeVisible();
  await expect(page.getByText("Unverified").first()).toBeVisible();
  await expect(
    page.getByText("2 cooling mentions found. Needs 3 to score.").first(),
  ).toBeVisible();
  await expect(page.getByText("Editor Score").first()).toBeVisible();
  await expect(page.getByText("Not reviewed").first()).toBeVisible();
  await expect(page.getByText("Guest data and editor checks stay separate")).toBeVisible();
});

test("affiliate endpoint redirects to a tracked booking URL", async ({ request }) => {
  const response = await request.get(
    "/api/affiliate-click?id=lisbon-art-stay-hotel-apartments-1",
    {
      maxRedirects: 0,
    },
  );

  expect(response.status()).toBe(307);
  const location = response.headers().location;
  expect(location).toContain(
    "https://www.booking.com/hotel/pt/lisbon-short-stay-apartments-baixa.html",
  );
  expect(location).toContain("utm_source=mintystays");
  expect(location).toContain("utm_medium=affiliate");
});
