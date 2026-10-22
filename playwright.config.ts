import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.CHROMIUM_PATH || undefined,
          // Fake microphone so the voice flow can be exercised headlessly.
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", ...(process.env.CHROMIUM_ARGS?.split(" ").filter(Boolean) ?? [])],
        },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: {
          executablePath: process.env.CHROMIUM_PATH || undefined,
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", ...(process.env.CHROMIUM_ARGS?.split(" ").filter(Boolean) ?? [])],
        },
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 90_000 },
});
