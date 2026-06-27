import { expect, test } from "@playwright/test";

test.skip(
  process.env.AUTH_ENABLED !== "true" || !process.env.DATABASE_URL,
  "Run with AUTH_ENABLED=true and DATABASE_URL to verify gated auth surfaces.",
);

test("auth-enabled flows expose sign-in and protected member/editor routes", async ({
  page,
  request,
}) => {
  const signIn = await request.get("/api/auth/signin");
  expect(signIn.status()).not.toBe(404);
  expect(signIn.status()).toBeLessThan(500);

  const insiderReport = await request.post("/api/insider/reports", {
    data: {
      listingId: "avenida-chill-hotel-1",
      vote: "confirm_cold",
    },
  });
  expect(insiderReport.status()).toBe(401);

  const editorUpdate = await request.patch(
    "/api/editor/listings/11111111-1111-4111-8111-111111111111",
    {
      data: {
        isHandpicked: true,
      },
    },
  );
  expect(editorUpdate.status()).toBe(403);

  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  await page.goto("/listings/avenida-chill-hotel-1");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});
