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

const testLocation = {
  location_id: "00000000-0000-0000-0000-000000000101",
  street: "20 Market St",
  city: "Newark",
  state: "NJ",
  zip: "07102"
};

const testClass = {
  class_id: "00000000-0000-0000-0000-000000000201",
  class_name: "Full-Size",
  daily_rate: 32.67,
  weekly_rate: 620.82
};

const testModel = {
  model_name: "Camry",
  make_name: "Toyota",
  model_year: 2026,
  class_id: testClass.class_id
};

const testCar = {
  vin: "TESTVIN0000000001",
  current_odometer_reading: 12450,
  location_id: testLocation.location_id,
  model_name: testModel.model_name
};

const testReservation = {
  reservation_id: "00000000-0000-0000-0000-000000000301",
  customer_id: testCustomer.customer_id,
  location_id: testLocation.location_id,
  return_location_id: testLocation.location_id,
  class_id: testClass.class_id,
  pickup_date_time: "2026-05-01T10:00:00",
  return_date_time_requested: "2026-05-03T10:00:00",
  reservation_status: "ACTIVE"
};

const testCustomerAccount = {
  account_id: "00000000-0000-0000-0000-000000000011",
  customer_id: testCustomer.customer_id,
  username: "john.doe",
  is_active: true,
  last_login_at: null,
  first_name: testCustomer.first_name,
  last_name: testCustomer.last_name,
  city: testCustomer.city,
  state: testCustomer.state,
  created_at: "2026-04-25T00:00:00",
  updated_at: "2026-04-25T00:00:00"
};

const testAuditEvent = {
  event_id: "00000000-0000-0000-0000-000000000901",
  entity_type: "location",
  entity_id: testLocation.location_id,
  action: "UPDATED",
  actor_role: "admin",
  actor_username: "admin",
  event_timestamp: "2026-04-25T12:00:00",
  notes: "Updated location fields: city."
};

async function signInAs(page, role, overrides = {}) {
  const catalogPayload = overrides.catalogPayload || {
    locations: [],
    car_classes: [],
    vehicle_options: [{
      class_id: "00000000-0000-0000-0000-000000000201",
      class_name: "Convertible",
      similar_model: "Ford Mustang Convertible or Similar",
      seats: 4,
      doors: 2,
      bags: 1,
      daily_rate: 89.95,
      weekly_rate: 566.69,
      rate_badge: "Discounted Rate",
      upgrade_badge: null,
      available_count: 0,
      is_available: false
    }],
    workflow: []
  };

  const summaryPayload = overrides.summaryPayload || {
    customer: testCustomer,
    reservations: [],
    rental_agreements: [],
    active_rentals: [],
    lifecycle_events: [],
    workflow: []
  };

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
      body: JSON.stringify(catalogPayload)
    });
  });
  await page.route("**/api/v1/customer-portal/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(summaryPayload)
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
  await page.route("**/api/v1/auth/customer-accounts", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testCustomerAccount]) });
  });
  await page.route("**/api/v1/customers", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testCustomer]) });
  });
  await page.route("**/api/v1/locations", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testLocation]) });
  });
  await page.route("**/api/v1/car-classes", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testClass]) });
  });
  await page.route("**/api/v1/models", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testModel]) });
  });
  await page.route("**/api/v1/cars", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testCar]) });
  });
  await page.route("**/api/v1/reservations", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testReservation]) });
  });
  await page.route("**/api/v1/rental-agreements", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([]) });
  });
  await page.route("**/api/v1/audit-events**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify([testAuditEvent]) });
  });
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (
      url.includes("/api/v1/auth/login") ||
      url.includes("/api/v1/auth/customer-accounts") ||
      url.includes("/api/v1/dashboard/overview") ||
      url.includes("/api/v1/customer-portal/catalog") ||
      url.includes("/api/v1/customer-portal/me") ||
      url.includes("/api/v1/auth/demo-customers") ||
      url.includes("/api/v1/customers") ||
      url.includes("/api/v1/locations") ||
      url.includes("/api/v1/car-classes") ||
      url.includes("/api/v1/models") ||
      url.includes("/api/v1/cars") ||
      url.includes("/api/v1/reservations") ||
      url.includes("/api/v1/rental-agreements") ||
      url.includes("/api/v1/audit-events")
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
  await expect(page.getByRole("heading", { name: /my trips?/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^my trip$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /reserve a car/i })).toBeVisible();

  const bookingDialog = page.getByRole("dialog", { name: /reserve a car/i });
  if (await bookingDialog.isVisible()) {
    await bookingDialog.getByRole("button", { name: /close/i }).click();
  }
  await page.getByRole("button", { name: /open profile/i }).click();
  await expect(page.getByRole("heading", { name: /demo customer/i })).toBeVisible();
  await expect(page.getByText("Customer Snapshot")).toBeVisible();
  await expect(page.getByText("Identity And Payment")).toBeVisible();
  await expect(page.getByText("**** 1111")).toBeVisible();
  await expect(page.getByText(testCustomer.credit_card_number)).toHaveCount(0);
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
  await expect(page.getByRole("button", { name: /^customers$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^fleet$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^pricing$/i })).toBeVisible();
  await expect(page.getByText("Operational Health")).toBeVisible();
  await expect(page.getByText("Entity Audit Trail")).toBeVisible();
  await expect(page.getByText("Updated location fields: city.")).toBeVisible();
});

test("admin data grids organize customers reservations cars and locations", async ({ page }) => {
  await signInAs(page, "admin");

  await page.getByRole("button", { name: /^customers$/i }).click();
  await expect(page.getByText("Registered Users")).toBeVisible();
  await expect(page.locator(".admin-data-grid").first()).toBeVisible();
  await expect(page.getByText("john.doe")).toBeVisible();
  await expect(page.getByText("Demo")).toBeVisible();

  await page.getByRole("button", { name: /^reservations$/i }).click();
  await expect(page.getByText("Reservation List")).toBeVisible();
  await expect(page.locator(".admin-data-grid").first()).toBeVisible();
  await expect(page.getByText("ACTIVE")).toBeVisible();
  await expect(page.getByText("Full-Size")).toBeVisible();

  await page.getByRole("button", { name: /^fleet$/i }).click();
  await expect(page.getByRole("heading", { name: "Locations", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cars", exact: true })).toBeVisible();
  await expect(page.getByText("Newark, NJ")).toBeVisible();
  await expect(page.getByText("Toyota Camry (Full-Size)")).toBeVisible();
});

for (const role of ["customer", "agent", "manager"]) {
  test(`${role} cannot open the admin console route`, async ({ page }) => {
    await signInAs(page, role);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /rental admin console/i })).toHaveCount(0);
  });
}

test("customer sees a validation error when customer summary payload is malformed", async ({ page }) => {
  await signInAs(page, "customer", {
    summaryPayload: {
      customer: {
        ...testCustomer,
        exp_month: "12"
      },
      reservations: [],
      rental_agreements: [],
      active_rentals: [],
      lifecycle_events: [],
      workflow: []
    }
  });

  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByText(/invalid api response for \/api\/v1\/customer-portal\/me/i)).toBeVisible();
});
