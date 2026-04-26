import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-live",
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  webServer: {
    command: "VITE_PROXY_TARGET=http://127.0.0.1:8000 npm run dev -- --host 127.0.0.1 --port 5174",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true
  }
});
