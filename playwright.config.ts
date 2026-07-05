import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localPort = process.env.PORT ?? "3000";
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${localPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `PORT=${localPort} MAP_STYLE_URL=http://127.0.0.1:${localPort}/test-map-style.json pnpm dev`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
