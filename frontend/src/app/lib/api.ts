import { getStoredAuthSession } from "./storage";
import type { ZodTypeAny } from "zod";
import {
  authSessionSchema,
  carSchema,
  carClassSchema,
  carClassesSchema,
  carsSchema,
  customerAccountAdminSchema,
  customerAccountAdminsSchema,
  customerSchema,
  customerPortalBookingResponseSchema,
  customerPortalCatalogSchema,
  customerPortalSummarySchema,
  customersSchema,
  dashboardOverviewSchema,
  demoCustomersSchema,
  entityAuditEventsSchema,
  locationSchema,
  locationsSchema,
  modelSchema,
  modelsSchema,
  rentalAgreementSchema,
  rentalAgreementsSchema,
  reservationSchema,
  reservationsSchema,
} from "./schemas";
import type {
  Car,
  CarClass,
  Customer,
  CustomerAccountAdmin,
  CustomerDemoAccount,
  CustomerPortalBookingRequest,
  CustomerPortalBookingResponse,
  CustomerPortalCatalog,
  CustomerPortalSummary,
  CustomerSignupRequest,
  DashboardOverview,
  EntityAuditEvent,
  Location,
  LoginRequest,
  Model,
  Reservation,
  RentalAgreement,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}, schema?: ZodTypeAny): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const token = skipAuth ? "" : getStoredAuthSession()?.access_token;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = await response.json();
      detail = payload?.detail || payload?.message || "";
    } catch {
      detail = "";
    }
    throw new Error(detail ? `Request failed (${response.status}): ${detail}` : `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  const payload = await response.json();
  if (!schema) {
    return payload as T;
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid API response for ${path}`);
  }

  return parsed.data as T;
}

export const api = {
  login(payload: LoginRequest) {
    return apiRequest("/api/v1/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify(payload),
    }, authSessionSchema);
  },
  signupCustomer(payload: CustomerSignupRequest) {
    return apiRequest("/api/v1/auth/customer-signup", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify(payload),
    }, authSessionSchema);
  },
  listDemoCustomers() {
    return apiRequest<CustomerDemoAccount[]>("/api/v1/auth/demo-customers", { skipAuth: true }, demoCustomersSchema);
  },
  listCustomerAccounts() {
    return apiRequest<CustomerAccountAdmin[]>("/api/v1/auth/customer-accounts", {}, customerAccountAdminsSchema);
  },
  createCustomerAccount(payload: CustomerSignupRequest & { is_active?: boolean }) {
    return apiRequest<CustomerAccountAdmin>("/api/v1/auth/customer-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }, customerAccountAdminSchema);
  },
  updateCustomerAccount(
    accountId: string,
    payload: Partial<CustomerSignupRequest> & { is_active?: boolean; username?: string; password?: string },
  ) {
    return apiRequest<CustomerAccountAdmin>(`/api/v1/auth/customer-accounts/${accountId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, customerAccountAdminSchema);
  },
  deleteCustomerAccount(accountId: string) {
    return apiRequest<void>(`/api/v1/auth/customer-accounts/${accountId}`, { method: "DELETE" });
  },
  getCustomerPortalCatalog() {
    return apiRequest<CustomerPortalCatalog>("/api/v1/customer-portal/catalog", {}, customerPortalCatalogSchema);
  },
  getMyCustomerPortalSummary() {
    return apiRequest<CustomerPortalSummary>("/api/v1/customer-portal/me", {}, customerPortalSummarySchema);
  },
  getCustomerPortalSummary(customerId: string) {
    return apiRequest<CustomerPortalSummary>(`/api/v1/customer-portal/summary/${customerId}`, {}, customerPortalSummarySchema);
  },
  createCustomerBooking(payload: CustomerPortalBookingRequest) {
    return apiRequest<CustomerPortalBookingResponse>("/api/v1/customer-portal/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }, customerPortalBookingResponseSchema);
  },
  listCustomers() {
    return apiRequest<Customer[]>("/api/v1/customers", {}, customersSchema);
  },
  listLocations() {
    return apiRequest<Location[]>("/api/v1/locations", {}, locationsSchema);
  },
  listCarClasses() {
    return apiRequest<CarClass[]>("/api/v1/car-classes", {}, carClassesSchema);
  },
  listModels() {
    return apiRequest<Model[]>("/api/v1/models", {}, modelsSchema);
  },
  listCars() {
    return apiRequest<Car[]>("/api/v1/cars", {}, carsSchema);
  },
  listReservations() {
    return apiRequest<Reservation[]>("/api/v1/reservations", {}, reservationsSchema);
  },
  listRentalAgreements() {
    return apiRequest<RentalAgreement[]>("/api/v1/rental-agreements", {}, rentalAgreementsSchema);
  },
  getDashboardOverview() {
    return apiRequest<DashboardOverview>("/api/v1/dashboard/overview", {}, dashboardOverviewSchema);
  },
  listAuditEvents(limit = 100) {
    return apiRequest<EntityAuditEvent[]>(`/api/v1/audit-events?limit=${limit}`, {}, entityAuditEventsSchema);
  },
  createCustomer(payload: Omit<Customer, "customer_id">) {
    return apiRequest<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(payload) }, customerSchema);
  },
  updateCustomer(customerId: string, payload: Partial<Omit<Customer, "customer_id">>) {
    return apiRequest<Customer>(`/api/v1/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, customerSchema);
  },
  deleteCustomer(customerId: string) {
    return apiRequest<void>(`/api/v1/customers/${customerId}`, { method: "DELETE" });
  },
  createReservation(payload: Omit<Reservation, "reservation_id">) {
    return apiRequest<Reservation>("/api/v1/reservations", { method: "POST", body: JSON.stringify(payload) }, reservationSchema);
  },
  updateReservation(reservationId: string, payload: Partial<Omit<Reservation, "reservation_id">>) {
    return apiRequest<Reservation>(`/api/v1/reservations/${reservationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, reservationSchema);
  },
  updateReservationStatus(reservationId: string, reservation_status: string) {
    return apiRequest<Reservation>(`/api/v1/reservations/${reservationId}`, {
      method: "PUT",
      body: JSON.stringify({ reservation_status }),
    }, reservationSchema);
  },
  deleteReservation(reservationId: string) {
    return apiRequest<void>(`/api/v1/reservations/${reservationId}`, { method: "DELETE" });
  },
  createRentalAgreement(payload: {
    reservation_id: string;
    vin: string;
    rental_start_date_time: string;
    start_odometer_reading?: number;
  }) {
    return apiRequest<RentalAgreement>("/api/v1/rental-agreements", { method: "POST", body: JSON.stringify(payload) }, rentalAgreementSchema);
  },
  closeRentalAgreement(contractNo: string, payload: { rental_end_date_time: string; end_odometer_reading: number; actual_cost?: number }) {
    return apiRequest<RentalAgreement>(`/api/v1/rental-agreements/${contractNo}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, rentalAgreementSchema);
  },
  createLocation(payload: Omit<Location, "location_id">) {
    return apiRequest<Location>("/api/v1/locations", { method: "POST", body: JSON.stringify(payload) }, locationSchema);
  },
  updateLocation(locationId: string, payload: Partial<Omit<Location, "location_id">>) {
    return apiRequest<Location>(`/api/v1/locations/${locationId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, locationSchema);
  },
  deleteLocation(locationId: string) {
    return apiRequest<void>(`/api/v1/locations/${locationId}`, { method: "DELETE" });
  },
  createCarClass(payload: Omit<CarClass, "class_id">) {
    return apiRequest<CarClass>("/api/v1/car-classes", { method: "POST", body: JSON.stringify(payload) }, carClassSchema);
  },
  updateCarClass(classId: string, payload: Partial<Omit<CarClass, "class_id">>) {
    return apiRequest<CarClass>(`/api/v1/car-classes/${classId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, carClassSchema);
  },
  deleteCarClass(classId: string) {
    return apiRequest<void>(`/api/v1/car-classes/${classId}`, { method: "DELETE" });
  },
  createModel(payload: Model) {
    return apiRequest<Model>("/api/v1/models", { method: "POST", body: JSON.stringify(payload) }, modelSchema);
  },
  updateModel(modelName: string, payload: Partial<Model>) {
    return apiRequest<Model>(`/api/v1/models/${encodeURIComponent(modelName)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, modelSchema);
  },
  deleteModel(modelName: string) {
    return apiRequest<void>(`/api/v1/models/${encodeURIComponent(modelName)}`, { method: "DELETE" });
  },
  createCar(payload: Car) {
    return apiRequest<Car>("/api/v1/cars", { method: "POST", body: JSON.stringify(payload) }, carSchema);
  },
  updateCar(vin: string, payload: Partial<Omit<Car, "vin">>) {
    return apiRequest<Car>(`/api/v1/cars/${vin}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, carSchema);
  },
  deleteCar(vin: string) {
    return apiRequest<void>(`/api/v1/cars/${vin}`, { method: "DELETE" });
  },
};

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatPercent(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)}%`;
}
