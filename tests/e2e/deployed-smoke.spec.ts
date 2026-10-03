import { expect, test } from "@playwright/test";

test("deployed site serves real inventory and healthy storage", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({
    ok: true,
    databaseConfigured: true,
    database: { ok: true },
  });

  await page.goto("/");
  await expect(page.locator(".map-canvas")).toHaveAttribute(
    "data-map-ready",
    "true",
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole("heading", { name: "Lisbon", exact: true }),
  ).toBeVisible();
  const cards = page.locator(".listing-card");
  await expect(cards.first()).toBeVisible();
  const link = cards.first().locator('a[href^="/listings/"]').first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(/^\/listings\/[0-9a-f-]{36}$/);
  await link.click();
  await expect(
    page.getByRole("heading", { name: "How was the cooling?" }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`${href}$`),
  );
  await expect(page.getByText("Guest Signal").first()).toBeVisible();
  await expect(page.getByText("Editor Score").first()).toBeVisible();

  for (const path of ["/guest-signal", "/robots.txt", "/sitemap.xml"]) {
    expect((await request.get(path)).status()).toBe(200);
  }
});

test("deployed mobile map keeps listing links usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?type=hotel");
  await expect(page.locator(".listing-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
