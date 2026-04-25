import { expect, test } from "@playwright/test";

async function signInAs(page, role) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(role === "admin" ? "rental admin console" : role === "manager" ? "manager dashboard" : role === "agent" ? "agent workspace" : "customer portal", "i") }).click();
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("customer is routed into the customer portal", async ({ page }) => {
  await signInAs(page, "customer");

  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByRole("heading", { name: /customer portal/i })).toBeVisible();
  await expect(page.getByText("Book A Reservation")).toBeVisible();
  await expect(page.getByRole("button", { name: /^my trip$/i })).toBeVisible();
  await expect(page.getByText("Customer journey BPMN")).toBeVisible();
});

test("agent is routed into the agent workspace", async ({ page }) => {
  await signInAs(page, "agent");

  await expect(page).toHaveURL(/\/agent$/);
  await expect(page.getByRole("heading", { name: /agent workspace/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^queue$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^pickup$/i })).toBeVisible();
});

test("manager is routed into the manager dashboard", async ({ page }) => {
  await signInAs(page, "manager");

  await expect(page).toHaveURL(/\/manager$/);
  await expect(page.getByRole("heading", { name: /manager dashboard/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^exceptions$/i })).toBeVisible();
  await expect(page.getByText("Branch visibility")).toBeVisible();
});

test("admin sees the mobile-first admin console with fleet and pricing tabs", async ({ page }) => {
  await signInAs(page, "admin");

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /rental admin console/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^fleet$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^pricing$/i })).toBeVisible();
  await expect(page.getByText("Operational Health")).toBeVisible();
});
