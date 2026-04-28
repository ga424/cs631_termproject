import { z } from "zod";

const roleSchema = z.enum(["customer", "agent", "manager", "admin"]);
const reservationStatusSchema = z.enum(["ACTIVE", "CANCELED", "FULFILLED", "COMPLETED", "NO_SHOW"]);
const rentalEventTypeSchema = z.enum(["RESERVED", "CANCELED", "NO_SHOW", "PICKED_UP", "RENTAL_OPENED", "RETURNED", "BILLED"]);

export const authSessionSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  username: z.string().min(1),
  role: roleSchema,
  customer_id: z.string().min(1).nullable().optional(),
  account_id: z.string().min(1).nullable().optional(),
});

export const workflowStageSchema = z.object({
  stage_id: z.string().min(1),
  label: z.string().min(1),
  owner_role: z.string().min(1),
  description: z.string().min(1),
});

export const locationSchema = z.object({
  location_id: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
});

export const customerSchema = z.object({
  customer_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  license_number: z.string().min(1),
  license_state: z.string().min(1),
  credit_card_type: z.string().min(1),
  credit_card_number: z.string().min(1),
  exp_month: z.number().int().min(1).max(12),
  exp_year: z.number().int().min(2000),
});

export const carClassSchema = z.object({
  class_id: z.string().min(1),
  class_name: z.string().min(1),
  daily_rate: z.number(),
  weekly_rate: z.number(),
});

export const modelSchema = z.object({
  model_name: z.string().min(1),
  make_name: z.string().min(1),
  model_year: z.number().int(),
  class_id: z.string().min(1),
});

export const carSchema = z.object({
  vin: z.string().min(1),
  current_odometer_reading: z.number().int(),
  location_id: z.string().min(1),
  model_name: z.string().min(1),
});

export const reservationSchema = z.object({
  reservation_id: z.string().min(1),
  customer_id: z.string().min(1),
  location_id: z.string().min(1),
  return_location_id: z.string().min(1).nullable(),
  class_id: z.string().min(1),
  pickup_date_time: z.string().min(1),
  return_date_time_requested: z.string().min(1),
  reservation_status: reservationStatusSchema,
});

export const rentalAgreementSchema = z.object({
  contract_no: z.string().min(1),
  reservation_id: z.string().min(1),
  vin: z.string().min(1),
  rental_start_date_time: z.string().min(1),
  start_odometer_reading: z.number().int(),
  rental_end_date_time: z.string().nullable(),
  end_odometer_reading: z.number().int().nullable(),
  actual_cost: z.number().nullable(),
});

export const customerDemoAccountSchema = z.object({
  customer_id: z.string().min(1),
  username: z.string().min(1),
  display_name: z.string().min(1),
  home_branch: z.string().nullable(),
  is_active: z.boolean(),
  trip_status: z.string().min(1),
  reservation_count: z.number().int().nonnegative(),
  active_rental_count: z.number().int().nonnegative(),
});

export const customerAccountAdminSchema = z.object({
  account_id: z.string().min(1),
  customer_id: z.string().min(1),
  username: z.string().min(1),
  is_active: z.boolean(),
  last_login_at: z.string().nullable(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
});

const dashboardTotalsSchema = z.object({
  total_cars: z.number().int().nonnegative(),
  available_cars: z.number().int().nonnegative(),
  rented_cars: z.number().int().nonnegative(),
  reserved_requests: z.number().int().nonnegative(),
});

const dashboardRateSummarySchema = z.object({
  class_id: z.string().min(1),
  class_name: z.string().min(1),
  daily_rate: z.number(),
  weekly_rate: z.number(),
  model_count: z.number().int().nonnegative(),
  vehicle_count: z.number().int().nonnegative(),
});

const dashboardLocationSummarySchema = z.object({
  location_id: z.string().min(1),
  location_name: z.string().min(1),
  total_cars: z.number().int().nonnegative(),
  available_cars: z.number().int().nonnegative(),
  rented_cars: z.number().int().nonnegative(),
  reserved_requests: z.number().int().nonnegative(),
  utilization_percent: z.number(),
});

const dashboardFleetItemSchema = z.object({
  vin: z.string().min(1),
  model_name: z.string().min(1),
  location_id: z.string().min(1),
  location_name: z.string().min(1),
  current_odometer_reading: z.number().int().nonnegative(),
  status: z.enum(["AVAILABLE", "RENTED"]),
  active_contract_no: z.string().min(1).nullable(),
});

const dashboardActiveRentalSchema = z.object({
  contract_no: z.string().min(1),
  vin: z.string().min(1),
  location_name: z.string().min(1),
  rental_start_date_time: z.string().min(1),
  return_date_time_requested: z.string().min(1),
  is_overdue: z.boolean(),
});

const dashboardUpcomingReservationSchema = z.object({
  reservation_id: z.string().min(1),
  location_name: z.string().min(1),
  pickup_date_time: z.string().min(1),
  return_date_time_requested: z.string().min(1),
  reservation_status: z.string().min(1),
});

export const dashboardOverviewSchema = z.object({
  generated_at: z.string().min(1),
  totals: dashboardTotalsSchema,
  rates: z.array(dashboardRateSummarySchema),
  locations: z.array(dashboardLocationSummarySchema),
  fleet: z.array(dashboardFleetItemSchema),
  active_rentals: z.array(dashboardActiveRentalSchema),
  upcoming_pickups: z.array(dashboardUpcomingReservationSchema),
});

const vehicleOptionSchema = z.object({
  class_id: z.string().min(1),
  class_name: z.string().min(1),
  similar_model: z.string().min(1),
  seats: z.number().int().nonnegative(),
  doors: z.number().int().nonnegative(),
  bags: z.number().int().nonnegative(),
  daily_rate: z.number(),
  weekly_rate: z.number(),
  rate_badge: z.string().min(1),
  upgrade_badge: z.string().nullable(),
  available_count: z.number().int().nonnegative(),
  is_available: z.boolean(),
});

export const rentalLifecycleEventSchema = z.object({
  event_id: z.string().min(1),
  reservation_id: z.string().min(1),
  contract_no: z.string().min(1).nullable(),
  customer_id: z.string().min(1),
  event_type: rentalEventTypeSchema,
  actor_role: z.string().min(1),
  actor_username: z.string().min(1),
  event_timestamp: z.string().min(1),
  notes: z.string().nullable(),
});

export const entityAuditEventSchema = z.object({
  event_id: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  action: z.enum(["CREATED", "UPDATED", "DELETED"]),
  actor_role: z.string().min(1),
  actor_username: z.string().min(1),
  event_timestamp: z.string().min(1),
  notes: z.string().nullable(),
});

export const customerPortalCatalogSchema = z.object({
  locations: z.array(locationSchema),
  car_classes: z.array(carClassSchema),
  vehicle_options: z.array(vehicleOptionSchema),
  workflow: z.array(workflowStageSchema),
});

export const customerPortalSummarySchema = z.object({
  customer: customerSchema,
  reservations: z.array(reservationSchema),
  rental_agreements: z.array(rentalAgreementSchema),
  active_rentals: z.array(rentalAgreementSchema),
  lifecycle_events: z.array(rentalLifecycleEventSchema),
  workflow: z.array(workflowStageSchema),
});

export const customerPortalBookingResponseSchema = z.object({
  customer_id: z.string().min(1),
  reservation: reservationSchema,
});

export const customersSchema = z.array(customerSchema);
export const locationsSchema = z.array(locationSchema);
export const carClassesSchema = z.array(carClassSchema);
export const modelsSchema = z.array(modelSchema);
export const carsSchema = z.array(carSchema);
export const reservationsSchema = z.array(reservationSchema);
export const rentalAgreementsSchema = z.array(rentalAgreementSchema);
export const demoCustomersSchema = z.array(customerDemoAccountSchema);
export const customerAccountAdminsSchema = z.array(customerAccountAdminSchema);
export const entityAuditEventsSchema = z.array(entityAuditEventSchema);
