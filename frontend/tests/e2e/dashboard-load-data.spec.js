import { expect, test } from "@playwright/test";

const emptyDashboard = {
  generated_at: "2026-04-25T00:00:00",
  totals: {
    total_cars: 0,
    available_cars: 0,
    rented_cars: 0,
    reserved_requests: 0
  },
  rates: [],
  locations: [],
  fleet: [],
  active_rentals: [],
  upcoming_pickups: []
};

const testCustomer = {
  customer_id: "00000000-0000-0000-0000-000000000001",
  first_name: "Demo",
  last_name: "Customer",
  street: "20 Market St",
  city: "Newark",
  state: "NJ",
  zip: "07102",
  license_number: "NJ-DEMO-1",
  license_state: "NJ",
  credit_card_type: "Visa",
  credit_card_number: "4111111111111111",
  exp_month: 12,
  exp_year: 2028
};

async function signInAs(page, role) {
  await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        access_token: `test-token-${role}`,
        token_type: "bearer",
        username: role,
        role,
        customer_id: role === "customer" ? testCustomer.customer_id : null,
        account_id: role === "customer" ? "00000000-0000-0000-0000-000000000011" : null
      })
    });
  });
  await page.route("**/api/v1/dashboard/overview", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(emptyDashboard) });
  });
  await page.route("**/api/v1/customer-portal/catalog", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ locations: [], car_classes: [], vehicle_options: [], workflow: [] })
    });
  });
  await page.route("**/api/v1/customer-portal/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        customer: testCustomer,
        reservations: [],
        rental_agreements: [],
        active_rentals: [],
        lifecycle_events: [],
        workflow: []
      })
    });
  });
  await page.route("**/api/v1/auth/demo-customers", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{
        customer_id: testCustomer.customer_id,
        username: "john.doe",
        display_name: "John Doe",
        home_branch: "Newark, NJ",
        is_active: true,
        trip_status: "Ready to book",
        reservation_count: 0,
        active_rental_count: 0
      }])
    });
  });
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (
      url.includes("/api/v1/auth/login") ||
      url.includes("/api/v1/dashboard/overview") ||
      url.includes("/api/v1/customer-portal/catalog") ||
      url.includes("/api/v1/customer-portal/me") ||
      url.includes("/api/v1/auth/demo-customers")
    ) {
      await route.fallback();
      return;
    }

    await route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
  });

  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(role === "admin" ? "rental admin console" : role === "manager" ? "manager dashboard" : role === "agent" ? "agent workspace" : "customer portal", "i") }).click();
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("customer is routed into the customer portal", async ({ page }) => {
  await signInAs(page, "customer");

  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByRole("heading", { name: /customer portal/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /my reservation and rental/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^my trip$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /reserve a car/i })).toBeVisible();
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
