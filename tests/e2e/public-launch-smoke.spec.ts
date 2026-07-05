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

  await page.goto("/?score=&type=hotel&trustTier=editor_verified");
  await expect(
    page.getByRole("heading", { name: "Avenida Chill Hotel" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alfama Cool Loft" })).toHaveCount(0);
  await expect(page.locator(".pin")).toHaveCount(1);

  await page.goto("/listings/baixa-breeze-rooms-3");
  await expect(
    page.getByRole("heading", { name: "Baixa Breeze Rooms" }),
  ).toBeVisible();
  await expect(page.getByText("Guest Signal").first()).toBeVisible();
  await expect(page.getByText("Editor Score").first()).toBeVisible();
  await expect(page.getByText("Early evidence is limited")).toBeVisible();

  await page.getByLabel("Report broken AC").check();
  await page.getByLabel("Optional note").fill("Portable unit stopped cooling.");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText("flagged for cooling review")).toBeVisible();

  const affiliate = await request.get(
    "/api/affiliate-click?id=baixa-breeze-rooms-3",
    {
      maxRedirects: 0,
    },
  );
  expect(affiliate.status()).toBe(307);
  expect(affiliate.headers().location).toContain(
    "https://example.com/book/baixa-breeze-rooms",
  );
});
