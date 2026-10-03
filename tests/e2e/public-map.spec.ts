import { expect, test } from "@playwright/test";

test("listings remain usable when the browser cannot create a WebGL map", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl") || type === "experimental-webgl") return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByText("Map unavailable. Browse and select stays in the list."),
  ).toBeVisible();
  await expect(page.locator(".listing-card")).toHaveCount(6);
  await page.locator('.listing-card a[href^="/listings/"]').first().click();
  await expect(
    page.getByRole("heading", { name: "How was the cooling?" }),
  ).toBeVisible();
});

test("renders launch-city map, pins, and non-empty listing cards", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".map-canvas")).toHaveAttribute("data-map-ready", "true");
  expect(errors).toEqual([]);

  await expect(
    page.getByRole("heading", { name: "Lisbon", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".pin")).toHaveCount(6);

  await expect(
    page.getByRole("heading", { name: "Lisbon Art Stay Hotel & Apartments" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lisbon 5 Hotel" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Be Poet Baixa Hotel" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lisbon Chillout Apartments" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "LSA Príncipe Real by Numa" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Charm Flats" })).toBeVisible();

  await expect(page.getByText("visible Guest Signal score")).toBeVisible();
  await expect(page.getByText("room AC was described as good")).toBeVisible();
  await expect(page.getByText("heatwave mention")).toBeVisible();
  await expect(page.getByText("unit had ample air conditioning")).toBeVisible();
});
