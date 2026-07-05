import { expect, test } from "@playwright/test";

test("public launch path covers map, filters, detail, dispute, and affiliate exit", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Lisbon", exact: true })).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(6);
  await expect(page.locator(".listing-card .evidence")).toHaveCount(6);

  for (const evidence of await page.locator(".listing-card .evidence").all()) {
    expect((await evidence.innerText()).trim().length).toBeGreaterThan(20);
  }

  await page.goto("/?score=&type=hotel&trustTier=");
  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon 5 Hotel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Be Poet Baixa Hotel" })).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(3);

  await page.goto("/listings/be-poet-baixa-hotel-3");
  await expect(
    page.getByRole("heading", { name: "Be Poet Baixa Hotel" }),
  ).toBeVisible();
  await expect(page.getByText("Guest Signal").first()).toBeVisible();
  await expect(page.getByText("Editor Score").first()).toBeVisible();
  await expect(page.getByText("heatwave mention")).toBeVisible();

  await page.getByLabel("Report broken AC").check();
  await page.getByLabel("Optional note").fill("Air conditioning never caught up.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("flagged for cooling review")).toBeVisible();

  const affiliate = await request.get(
    "/api/affiliate-click?id=be-poet-baixa-hotel-3",
    {
      maxRedirects: 0,
    },
  );
  expect(affiliate.status()).toBe(307);
  expect(affiliate.headers().location).toContain(
    "https://www.booking.com/hotel/pt/be-poet-baixa.html",
  );
});
