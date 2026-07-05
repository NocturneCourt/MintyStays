import { expect, test } from "@playwright/test";

test("keeps auth-gated surfaces unavailable while public site works", async ({
  page,
  request,
}) => {
  const authSession = await request.get("/api/auth/session");
  expect(authSession.status()).toBe(404);

  const insiderReport = await request.post("/api/insider/reports", {
    data: {
      listingId: "avenida-chill-hotel-1",
      vote: "confirm_cold",
    },
  });
  expect(insiderReport.status()).toBe(404);

  const editorUpdate = await request.patch(
    "/api/editor/listings/avenida-chill-hotel-1",
    {
      data: {
        isHandpicked: true,
      },
    },
  );
  expect(editorUpdate.status()).toBe(404);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lisbon", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.locator(".pin")).toHaveCount(6);

  await page.goto("/listings/avenida-chill-hotel-1");
  await expect(
    page.getByRole("heading", { name: "Avenida Chill Hotel" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "How was the cooling?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Insider report" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Edit editorial fields" })).toHaveCount(0);
});
