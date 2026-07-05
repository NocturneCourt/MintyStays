import { expect, test } from "@playwright/test";

test("does not manufacture editorial badges for Booking-only seed listings", async ({
  page,
}) => {
  await page.goto("/");

  const artStayCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", {
      name: "Lisbon Art Stay Hotel & Apartments",
    }),
  });
  const bePoetCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", { name: "Be Poet Baixa Hotel" }),
  });

  await expect(artStayCard.getByText("Unverified").first()).toBeVisible();
  await expect(artStayCard.getByText("Editor Verified")).toHaveCount(0);
  await expect(artStayCard.getByText("Handpicked")).toHaveCount(0);
  await expect(bePoetCard.getByText("Unverified").first()).toBeVisible();
  await expect(bePoetCard.getByText("Editor Verified")).toHaveCount(0);
  await expect(bePoetCard.getByText("Handpicked")).toHaveCount(0);

  await page.goto("/listings/lisbon-art-stay-hotel-apartments-1");
  await expect(page.locator(".detail-main").getByText("Unverified").first()).toBeVisible();
  await expect(page.locator(".detail-main").getByText("Handpicked")).toHaveCount(0);
  await expect(page.locator(".detail-main").getByText("Editor Verified")).toHaveCount(0);
});
