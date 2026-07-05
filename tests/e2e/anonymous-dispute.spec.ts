import { expect, test } from "@playwright/test";

test("anonymous visitor disputes weak cooling once per listing session", async ({
  page,
}) => {
  await page.goto("/listings/lisbon-art-stay-hotel-apartments-1");

  await expect(page.getByRole("heading", { name: "How was the cooling?" })).toBeVisible();
  await page.getByLabel("Dispute weak").check();
  await page
    .getByLabel("Optional note")
    .fill("The room never got below warm during the afternoon.");
  await page.getByRole("button", { name: "Send report" }).click();

  await expect(page.getByText("flagged for cooling review")).toBeVisible();

  await page.getByRole("button", { name: "Send report" }).click();

  await expect(
    page.getByText("You already sent a cooling report for this listing."),
  ).toBeVisible();
});

test("anonymous contribution API sets a session cookie and blocks duplicates", async ({
  request,
}) => {
  const payload = {
    listingId: "lisbon-5-hotel-2",
    vote: "confirm_cold",
    comment: "Bedroom stayed cold all night.",
  };

  const first = await request.post("/api/contributions", { data: payload });
  expect(first.status()).toBe(201);
  await expect(first.json()).resolves.toMatchObject({
    status: "created",
    persisted: false,
  });

  const second = await request.post("/api/contributions", { data: payload });
  expect(second.status()).toBe(409);
  await expect(second.json()).resolves.toMatchObject({
    status: "duplicate",
    persisted: false,
  });
});
