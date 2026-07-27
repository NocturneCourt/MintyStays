import { expect, test } from "@playwright/test";

test("shows Handpicked and Editor Verified badges from enriched launch seed", async ({
  page,
}) => {
  await page.goto("/");

  const artStayCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", {
      name: "Lisbon Art Stay Hotel & Apartments",
    }),
  });
  const lisbon5Card = page.locator(".listing-card").filter({
    has: page.getByRole("heading", { name: "Lisbon 5 Hotel" }),
  });
  const bePoetCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", { name: "Be Poet Baixa Hotel" }),
  });

  // Scored Guest Signal listing without editorial badges.
  await expect(artStayCard.getByText("Scored").first()).toBeVisible();
  await expect(artStayCard.getByText("Editor Verified")).toHaveCount(0);
  await expect(artStayCard.getByText("Handpicked")).toHaveCount(0);

  await expect(lisbon5Card.getByText("Handpicked").first()).toBeVisible();
  await expect(bePoetCard.getByText("Editor Verified").first()).toBeVisible();

  await page.goto("/listings/lisbon-5-hotel-2");
  await expect(page.locator(".detail-main").getByText("Handpicked").first()).toBeVisible();

  await page.goto("/listings/be-poet-baixa-hotel-3");
  await expect(
    page.locator(".detail-main").getByText("Editor Verified").first(),
  ).toBeVisible();
});
