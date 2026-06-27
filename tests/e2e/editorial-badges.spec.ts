import { expect, test } from "@playwright/test";

test("renders Handpicked and Editor Verified as distinct trust meanings", async ({
  page,
}) => {
  await page.goto("/");

  const verifiedCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", { name: "Avenida Chill Hotel" }),
  });
  const handpickedCard = page.locator(".listing-card").filter({
    has: page.getByRole("heading", { name: "Alfama Cool Loft" }),
  });

  await expect(verifiedCard.getByText("Editor Verified")).toBeVisible();
  await expect(verifiedCard.getByText("Handpicked")).toHaveCount(0);
  await expect(handpickedCard.getByText("Handpicked")).toBeVisible();
  await expect(handpickedCard.getByText("Editor Verified")).toHaveCount(0);

  await page.goto("/listings/avenida-chill-hotel-1");
  await expect(page.locator(".detail-main").getByText("Editor Verified")).toBeVisible();
  await expect(page.locator(".detail-main").getByText("Handpicked")).toHaveCount(0);

  await page.goto("/listings/alfama-cool-loft-2");
  await expect(page.locator(".detail-main").getByText("Handpicked")).toBeVisible();
  await expect(page.locator(".detail-main").getByText("Editor Verified")).toHaveCount(0);
}
);
