import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4178",
    headless: true,
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: "node tests/server.mjs 4178",
    port: 4178,
    reuseExistingServer: true,
    timeout: 15000
  }
});
