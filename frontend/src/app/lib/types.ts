export type Role = "customer" | "agent" | "manager" | "admin";

export type LoginRequest = {
  username: string;
  password: string;
};

export type CustomerSignupRequest = Omit<Customer, "customer_id"> & {
  username: string;
  password: string;
};

export type CustomerDemoAccount = {
  customer_id: string;
  username: string;
  display_name: string;
  home_branch: string | null;
  is_active: boolean;
  trip_status: string;
  reservation_count: number;
  active_rental_count: number;
};

export type WorkflowStage = {
  stage_id: string;
  label: string;
  owner_role: string;
  description: string;
};

export type Location = {
  location_id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type Customer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  license_number: string;
  license_state: string;
  credit_card_type: string;
  credit_card_number: string;
  exp_month: number;
  exp_year: number;
};

export type CarClass = {
  class_id: string;
  class_name: string;
  daily_rate: number;
  weekly_rate: number;
};

export type Model = {
  model_name: string;
  make_name: string;
  model_year: number;
  class_id: string;
};

export type Car = {
  vin: string;
  current_odometer_reading: number;
  location_id: string;
  model_name: string;
};

export type ReservationStatus = "ACTIVE" | "CANCELED" | "FULFILLED" | "COMPLETED" | "NO_SHOW";

export type Reservation = {
  reservation_id: string;
  customer_id: string;
  location_id: string;
  return_location_id: string | null;
  class_id: string;
  pickup_date_time: string;
  return_date_time_requested: string;
  reservation_status: ReservationStatus;
};

export type RentalAgreement = {
  contract_no: string;
  reservation_id: string;
  vin: string;
  rental_start_date_time: string;
  start_odometer_reading: number;
  rental_end_date_time: string | null;
  end_odometer_reading: number | null;
  actual_cost: number | null;
};

export type RentalLifecycleEvent = {
  event_id: string;
  reservation_id: string;
  contract_no: string | null;
  customer_id: string;
  event_type: "RESERVED" | "CANCELED" | "NO_SHOW" | "PICKED_UP" | "RENTAL_OPENED" | "RETURNED" | "BILLED";
  actor_role: string;
  actor_username: string;
  event_timestamp: string;
  notes: string | null;
};

export type DashboardTotals = {
  total_cars: number;
  available_cars: number;
  rented_cars: number;
  reserved_requests: number;
};

export type DashboardRateSummary = {
  class_id: string;
  class_name: string;
  daily_rate: number;
  weekly_rate: number;
  model_count: number;
  vehicle_count: number;
};

export type DashboardLocationSummary = {
  location_id: string;
  location_name: string;
  total_cars: number;
  available_cars: number;
  rented_cars: number;
  reserved_requests: number;
  utilization_percent: number;
};

export type DashboardFleetItem = {
  vin: string;
  model_name: string;
  location_id: string;
  location_name: string;
  current_odometer_reading: number;
  status: "AVAILABLE" | "RENTED";
  active_contract_no: string | null;
};

export type DashboardActiveRental = {
  contract_no: string;
  vin: string;
  location_name: string;
  rental_start_date_time: string;
  return_date_time_requested: string;
  is_overdue: boolean;
};

export type DashboardUpcomingReservation = {
  reservation_id: string;
  location_name: string;
  pickup_date_time: string;
  return_date_time_requested: string;
  reservation_status: string;
};

export type DashboardOverview = {
  generated_at: string;
  totals: DashboardTotals;
  rates: DashboardRateSummary[];
  locations: DashboardLocationSummary[];
  fleet: DashboardFleetItem[];
  active_rentals: DashboardActiveRental[];
  upcoming_pickups: DashboardUpcomingReservation[];
};

export type CustomerPortalCatalog = {
  locations: Location[];
  car_classes: CarClass[];
  vehicle_options: {
    class_id: string;
    class_name: string;
    similar_model: string;
    seats: number;
    doors: number;
    bags: number;
    daily_rate: number;
    weekly_rate: number;
    rate_badge: string;
    upgrade_badge: string | null;
    available_count: number;
    is_available: boolean;
  }[];
  workflow: WorkflowStage[];
};

export type CustomerPortalSummary = {
  customer: Customer;
  reservations: Reservation[];
  rental_agreements: RentalAgreement[];
  active_rentals: RentalAgreement[];
  lifecycle_events: RentalLifecycleEvent[];
  workflow: WorkflowStage[];
};

export type CustomerPortalBookingRequest = Omit<Customer, "customer_id"> & {
  location_id: string;
  return_location_id?: string | null;
  class_id: string;
  pickup_date_time: string;
  return_date_time_requested: string;
};

export type CustomerPortalBookingResponse = {
  customer_id: string;
  reservation: Reservation;
};
