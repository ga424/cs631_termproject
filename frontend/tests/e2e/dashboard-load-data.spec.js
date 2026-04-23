import { expect, test } from "@playwright/test";

test("clicking Load Dashboard renders seeded fleet data", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/username/i).fill("admin");
  await page.getByLabel(/password/i).fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.getByRole("button", { name: /load dashboard/i }).click();

  await expect(page.getByRole("region", { name: "Pricing snapshot" })).toBeVisible();
  await expect(page.getByText("Lowest Daily")).toBeVisible();
  await expect(page.getByRole("heading", { name: "$35" })).toBeVisible();

  await expect(page.getByText("Total Fleet")).toBeVisible();
  await expect(page.getByText("10").first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Class Rates" })).toBeVisible();
  await expect(page.getByText("Economy")).toBeVisible();
  await expect(page.getByText("$200")).toBeVisible();

  // Seed script inserts this VIN deterministically.
  await expect(page.getByText("WBADT43452G942186")).toBeVisible();
  await expect(page.getByText("Toyota Corolla").first()).toBeVisible();
});
