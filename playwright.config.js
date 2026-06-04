import { defineConfig, devices } from "@playwright/test";

const prodInvest = process.env.PLAYWRIGHT_BASE_URL?.includes("invest.");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173/invest/";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !prodInvest,
  forbidOnly: !!process.env.CI,
  retries: prodInvest ? 1 : process.env.CI ? 2 : 0,
  workers: prodInvest ? 1 : process.env.CI ? 1 : undefined,
  timeout: prodInvest ? 90_000 : 60_000,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER || prodInvest
      ? undefined
      : {
          command: "npm run dev:web",
          url: "http://localhost:5173/invest/",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
});
