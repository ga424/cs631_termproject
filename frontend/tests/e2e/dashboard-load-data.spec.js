import { expect, test } from "@playwright/test";

test("admin sees the mobile-first admin console with fleet and pricing tabs", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel(/username/i).fill("admin");
  await page.getByLabel(/password/i).fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: /rental admin console/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^fleet$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^pricing$/i })).toBeVisible();
  await expect(page.getByText("Operational Health")).toBeVisible();
});

test("customer sees the separate mobile-first customer portal", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /customer portal/i }).click();
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByRole("heading", { name: /customer portal/i })).toBeVisible();
  await expect(page.getByText("Book A Reservation")).toBeVisible();
  await expect(page.getByRole("button", { name: /^my trip$/i })).toBeVisible();
  await expect(page.getByText("Customer journey BPMN")).toBeVisible();
});
