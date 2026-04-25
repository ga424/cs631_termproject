import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-live",
  timeout: 90_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true
  }
});
