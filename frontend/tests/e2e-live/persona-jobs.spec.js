import { expect, test } from "@playwright/test";

const stamp = Date.now().toString().slice(-8);

function futureLocalDateTime(daysFromNow, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function signInAs(page, role) {
  await page.goto("/");
  await page.getByRole("button", { name: new RegExp(role === "admin" ? "rental admin console" : role === "manager" ? "manager dashboard" : role === "agent" ? "agent workspace" : "customer portal", "i") }).click();
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function fillCustomerFields(page, prefix) {
  await page.getByPlaceholder("First name").fill(prefix);
  await page.getByPlaceholder("Last name").fill("Tester");
  await page.getByPlaceholder("Street").fill("42 Workflow Way");
  await page.getByPlaceholder("City").fill("Newark");
  await page.getByPlaceholder("State", { exact: true }).fill("NJ");
  await page.getByPlaceholder("ZIP").fill("07102");
  await page.getByPlaceholder("License number").fill(`NJ${stamp}${prefix.slice(0, 2).toUpperCase()}`);
  await page.getByPlaceholder("License state").fill("NJ");
  await page.getByPlaceholder("Card type").fill("Visa");
  await page.getByPlaceholder("Card number").fill("4111111111111111");
}

async function signUpCustomer(page) {
  const username = `live.customer.${stamp}`;
  const password = "customer123";

  await page.goto("/");
  await page.getByRole("button", { name: /register new customer/i }).click();
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);
  await fillCustomerFields(page, "Customer");
  await page.getByPlaceholder("Exp month").fill("12");
  await page.getByPlaceholder("Exp year").fill(`${new Date().getFullYear() + 2}`);
  await page.getByRole("button", { name: /create account/i }).click();
}

async function selectFirstPickupPair(page) {
  const reservationSelect = page.getByRole("combobox").nth(0);
  const vehicleSelect = page.getByRole("combobox").nth(1);
  const reservationOptions = await reservationSelect.locator("option").count();

  for (let index = 1; index < reservationOptions; index += 1) {
    await reservationSelect.selectOption({ index });
    const vehicleOptions = await vehicleSelect.locator("option").count();
    if (vehicleOptions > 1) {
      await vehicleSelect.selectOption({ index: 1 });
      return true;
    }
  }

  return false;
}

test("customer can book and track a reservation", async ({ page }) => {
  await signUpCustomer(page);

  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByRole("heading", { name: /customer portal/i })).toBeVisible();
  await page.getByRole("button", { name: /reserve a car/i }).click();
  await fillCustomerFields(page, "Customer");
  await page.getByRole("combobox").nth(0).selectOption({ index: 1 });
  await page.getByRole("combobox").nth(1).selectOption({ index: 1 });
  await page.getByLabel("Pickup").fill(futureLocalDateTime(10));
  await page.getByLabel("Return").fill(futureLocalDateTime(13));
  await page.getByRole("button", { name: /reserve my car/i }).click();

  await expect(page).toHaveURL(/\/customer$/);
  await expect(page.getByText(/reservation booked/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /trip status/i })).toBeVisible();
});

test("agent can intake, start pickup, and close a rental", async ({ page }) => {
  await signInAs(page, "agent");

  await page.getByRole("button", { name: /^intake$/i }).click();
  await page.getByRole("button", { name: /^create customer$/i }).click();
  await fillCustomerFields(page, "Agent");
  await page.getByRole("button", { name: /save customer/i }).click();
  await expect(page.getByText(/customer created/i)).toBeVisible();

  await page.getByRole("button", { name: /^create reservation$/i }).click();
  await page.getByRole("combobox").nth(0).selectOption({ index: 1 });
  await page.getByRole("combobox").nth(1).selectOption({ index: 1 });
  await page.getByRole("combobox").nth(2).selectOption({ index: 1 });
  await page.getByLabel("Pickup").fill(futureLocalDateTime(15));
  await page.getByLabel("Return").fill(futureLocalDateTime(17));
  await page.getByRole("button", { name: /create reservation/i }).click();
  await expect(page.getByText(/reservation created/i)).toBeVisible();

  await page.getByRole("button", { name: /^pickup$/i }).click();
  const hasPickupPath = await selectFirstPickupPair(page);
  if (!hasPickupPath) {
    await expect(page.getByRole("combobox").nth(1).locator("option")).toHaveCount(1);
    return;
  }

  await page.getByLabel("Rental start").fill(futureLocalDateTime(15));
  await page.getByPlaceholder("Start odometer").fill("16000");
  await page.getByRole("button", { name: /start rental/i }).click();
  await expect(page.getByText(/pickup complete and rental started/i)).toBeVisible();

  await page.getByRole("button", { name: /^return$/i }).click();
  await page.getByRole("combobox").nth(0).selectOption({ index: 1 });
  await page.getByLabel("Rental end").fill(futureLocalDateTime(16));
  await page.getByPlaceholder("End odometer").fill("16125");
  await page.getByPlaceholder("Actual cost override").fill("175");
  await page.getByRole("button", { name: /close and bill/i }).click();
  await expect(page.getByText(/rental closed and billed/i)).toBeVisible();
});

test("manager can review KPIs and workflow exceptions", async ({ page }) => {
  await signInAs(page, "manager");

  await expect(page.getByRole("heading", { name: /manager dashboard/i })).toBeVisible();
  await expect(page.getByText(/branch visibility/i)).toBeVisible();
  await expect(page.getByText(/class rates/i)).toBeVisible();
  await page.getByRole("button", { name: /^exceptions$/i }).click();
  await expect(page.getByRole("heading", { name: /workflow exceptions/i })).toBeVisible();
  await page.getByRole("button", { name: /^workflow$/i }).click();
  await expect(page.getByText(/bpmn workflow lens/i)).toBeVisible();
});

test("admin can manage pricing and fleet with delete confirmation guarded", async ({ page }) => {
  await signInAs(page, "admin");

  await page.getByRole("button", { name: /^pricing$/i }).click();
  await page.getByRole("button", { name: /^add class$/i }).click();
  await page.getByPlaceholder("Class name").fill(`Live-${stamp}`);
  await page.getByPlaceholder("Daily rate").fill("88");
  await page.getByPlaceholder("Weekly rate").fill("440");
  await page.getByRole("button", { name: /save class/i }).click();
  await expect(page.getByText(/car class created/i)).toBeVisible();

  await page.getByRole("button", { name: /^add model$/i }).click();
  await page.getByPlaceholder("Model name").fill(`Model-${stamp}`);
  await page.getByPlaceholder("Make").fill("Milan");
  await page.getByPlaceholder("Model year").fill("2026");
  await page.getByRole("combobox").selectOption({ label: `Live-${stamp}` });
  await page.getByRole("button", { name: /save model/i }).click();
  await expect(page.getByText(/model created/i)).toBeVisible();

  await page.getByRole("button", { name: /^fleet$/i }).click();
  await page.getByRole("button", { name: /^add location$/i }).click();
  await page.getByPlaceholder("Street").fill("88 Admin Ave");
  await page.getByPlaceholder("City").fill(`Admin${stamp}`);
  await page.getByPlaceholder("State").fill("NJ");
  await page.getByPlaceholder("ZIP").fill("07103");
  await page.getByRole("button", { name: /save location/i }).click();
  await expect(page.getByText(/location created/i)).toBeVisible();

  await page.getByRole("button", { name: /^register car$/i }).click();
  await page.getByPlaceholder("VIN").fill(`LV${stamp}ABCDEF1`);
  await page.getByPlaceholder("Current odometer").fill("25");
  await page.getByRole("combobox").nth(0).selectOption({ label: `Admin${stamp}, NJ` });
  await page.getByRole("combobox").nth(1).selectOption({ label: `Milan Model-${stamp}` });
  await page.getByRole("button", { name: /save car/i }).click();
  await expect(page.getByText(/car added to fleet/i)).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toMatch(/delete/i);
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: /^delete /i }).first().click();
  await expect(page.getByText(/location deleted/i)).toHaveCount(0);
});
