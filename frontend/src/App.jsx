import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DASHBOARD_PATH = "/api/v1/dashboard/overview";
const AUTH_STORAGE_KEY = "rentacar_staff_auth";
const CUSTOMER_STORAGE_KEY = "rentacar_customer_portal_id";

const DEFAULT_CUSTOMER_BOOKING_FORM = {
  first_name: "",
  last_name: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  license_number: "",
  license_state: "",
  credit_card_type: "Visa",
  credit_card_number: "",
  exp_month: 12,
  exp_year: new Date().getFullYear() + 2,
  location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: ""
};

const DEFAULT_CUSTOMER_FORM = {
  first_name: "",
  last_name: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  license_number: "",
  license_state: "",
  credit_card_type: "Visa",
  credit_card_number: "",
  exp_month: 12,
  exp_year: new Date().getFullYear() + 2
};

const DEFAULT_RESERVATION_FORM = {
  customer_id: "",
  location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: "",
  reservation_status: "ACTIVE"
};

const DEFAULT_RENTAL_FORM = {
  reservation_id: "",
  vin: "",
  rental_start_date_time: "",
  start_odometer_reading: ""
};

const DEFAULT_RETURN_FORM = {
  contract_no: "",
  rental_end_date_time: "",
  end_odometer_reading: "",
  actual_cost: ""
};

const ROLE_COPY = {
  customer: {
    title: "Customer Portal",
    subtitle: "Book a trip, follow your reservation, and track your active rental from a mobile-first experience."
  },
  agent: {
    title: "Agent Workspace",
    subtitle: "Handle intake, walk-ins, pickups, returns, and exceptions with a task-first branch workflow."
  },
  manager: {
    title: "Manager Dashboard",
    subtitle: "Track branch health, blocked cases, overdue returns, and workflow throughput."
  },
  admin: {
    title: "Rental Admin Console",
    subtitle: "Maintain branch setup, fleet records, pricing, and BPMN-aligned operating controls."
  }
};

const ROLE_TABS = {
  customer: [
    { id: "book", label: "Book" },
    { id: "trip", label: "My Trip" },
    { id: "workflow", label: "Workflow" }
  ],
  agent: [
    { id: "queue", label: "Queue" },
    { id: "intake", label: "Intake" },
    { id: "pickup", label: "Pickup" },
    { id: "return", label: "Return" }
  ],
  manager: [
    { id: "overview", label: "Overview" },
    { id: "exceptions", label: "Exceptions" },
    { id: "workflow", label: "Workflow" }
  ],
  admin: [
    { id: "operations", label: "Ops" },
    { id: "inventory", label: "Fleet" },
    { id: "pricing", label: "Pricing" },
    { id: "workflow", label: "Workflow" }
  ]
};

const DEFAULT_TAB_BY_ROLE = {
  customer: "book",
  agent: "queue",
  manager: "overview",
  admin: "operations"
};

const STAFF_WORKFLOW = [
  {
    stage_id: "customer-intake",
    label: "Customer Intake",
    owner_role: "agent",
    description: "Capture a caller or walk-in customer and validate identity and payment details."
  },
  {
    stage_id: "reservation-active",
    label: "Reservation Active",
    owner_role: "customer",
    description: "Reservation is confirmed and waiting for the pickup window."
  },
  {
    stage_id: "pickup-assignment",
    label: "Pickup Assignment",
    owner_role: "agent",
    description: "Assign a matching VIN and convert the reservation into an active rental agreement."
  },
  {
    stage_id: "rental-live",
    label: "Rental In Progress",
    owner_role: "customer",
    description: "Vehicle is in use and should remain visible in queue, branch, and customer views."
  },
  {
    stage_id: "return-billing",
    label: "Return And Billing",
    owner_role: "agent",
    description: "Close the contract, capture mileage, and compute final billing."
  },
  {
    stage_id: "fleet-admin",
    label: "Fleet And Pricing Maintenance",
    owner_role: "admin",
    description: "Keep inventory, location, and rate setup aligned with branch operations."
  }
];

async function apiRequest(path, options = {}) {
  const { skipAuth, ...fetchOptions } = options;
  const storedAuth = getStoredAuthSession();
  const token = skipAuth ? "" : storedAuth?.access_token;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers
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
    return null;
  }

  return response.json();
}

function getStoredAuthSession() {
  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function getStoredCustomerPortalId() {
  return window.localStorage.getItem(CUSTOMER_STORAGE_KEY) || "";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function reservationStepIndex(status) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return 1;
    case "COMPLETED":
      return 3;
    case "CANCELED":
    case "NO_SHOW":
      return 1;
    default:
      return 0;
  }
}

function rentalStepIndex(rental) {
  if (!rental) {
    return 0;
  }
  return rental.rental_end_date_time ? 4 : 3;
}

function Shell({ title, subtitle, role, children, tabs, activeTab, setActiveTab, onSignOut }) {
  return (
    <div className="app-shell">
      <header className="mobile-hero">
        <div>
          <p className="eyebrow">{role.toUpperCase()}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onSignOut}>Sign Out</button>
      </header>
      <main className="mobile-main">{children}</main>
      <nav className="bottom-nav" aria-label={`${role} navigation`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "nav-pill active" : "nav-pill"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <section className="surface-card">
      <div className="surface-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function StatGrid({ stats }) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <article key={stat.label} className="stat-tile">
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </article>
      ))}
    </div>
  );
}

function QueueList({ title, items, emptyText }) {
  return (
    <div className="queue-card">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="stack-list">
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
              {item.meta ? <span>{item.meta}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-block">{emptyText}</div>
      )}
    </div>
  );
}

function WorkflowTracker({ stages, activeIndex, title }) {
  return (
    <div className="tracker-card">
      <h3>{title}</h3>
      <ol className="workflow-list">
        {stages.map((stage, index) => (
          <li key={stage.stage_id} className={index <= activeIndex ? "workflow-step active" : "workflow-step"}>
            <div className="workflow-bullet">{index + 1}</div>
            <div>
              <strong>{stage.label}</strong>
              <p>{stage.description}</p>
              <span>{stage.owner_role}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AlertStrip({ error, success }) {
  return (
    <>
      {error ? <div className="banner error">{error}</div> : null}
      {success ? <div className="banner success">{success}</div> : null}
    </>
  );
}

export default function App() {
  const [authSession, setAuthSession] = useState(() => getStoredAuthSession());
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB_BY_ROLE[getStoredAuthSession()?.role || "customer"]);
  const [loginForm, setLoginForm] = useState({ username: "customer", password: "customer123" });
  const [loggingIn, setLoggingIn] = useState(false);

  const [dashboard, setDashboard] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [carClasses, setCarClasses] = useState([]);
  const [models, setModels] = useState([]);
  const [cars, setCars] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [rentalAgreements, setRentalAgreements] = useState([]);

  const [customerCatalog, setCustomerCatalog] = useState({ locations: [], car_classes: [], workflow: [] });
  const [customerSummary, setCustomerSummary] = useState(null);
  const [customerPortalId, setCustomerPortalId] = useState(() => getStoredCustomerPortalId());

  const [customerBookingForm, setCustomerBookingForm] = useState(DEFAULT_CUSTOMER_BOOKING_FORM);
  const [customerForm, setCustomerForm] = useState(DEFAULT_CUSTOMER_FORM);
  const [reservationForm, setReservationForm] = useState(DEFAULT_RESERVATION_FORM);
  const [rentalForm, setRentalForm] = useState(DEFAULT_RENTAL_FORM);
  const [reservationStatusForm, setReservationStatusForm] = useState({ reservation_id: "", reservation_status: "CANCELED" });
  const [returnForm, setReturnForm] = useState(DEFAULT_RETURN_FORM);
  const [locationForm, setLocationForm] = useState({ street: "", city: "", state: "", zip: "" });
  const [classForm, setClassForm] = useState({ class_name: "", daily_rate: "", weekly_rate: "" });
  const [modelForm, setModelForm] = useState({ model_name: "", make_name: "", model_year: "", class_id: "" });
  const [carForm, setCarForm] = useState({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });

  const role = authSession?.role || "customer";
  const tabs = ROLE_TABS[role] || ROLE_TABS.customer;

  const customerById = useMemo(() => Object.fromEntries(customers.map((item) => [item.customer_id, item])), [customers]);
  const locationById = useMemo(() => Object.fromEntries(locations.map((item) => [item.location_id, item])), [locations]);
  const classById = useMemo(() => Object.fromEntries(carClasses.map((item) => [item.class_id, item])), [carClasses]);
  const modelByName = useMemo(() => Object.fromEntries(models.map((item) => [item.model_name, item])), [models]);
  const reservationById = useMemo(() => Object.fromEntries(reservations.map((item) => [item.reservation_id, item])), [reservations]);

  const activeReservations = useMemo(() => reservations.filter((item) => item.reservation_status === "ACTIVE"), [reservations]);
  const openRentals = useMemo(() => rentalAgreements.filter((item) => !item.rental_end_date_time), [rentalAgreements]);
  const openRentalVinSet = useMemo(() => new Set(openRentals.map((item) => item.vin)), [openRentals]);

  const assignableCars = useMemo(() => {
    const selectedReservation = reservationById[rentalForm.reservation_id];
    if (!selectedReservation) {
      return cars.filter((car) => !openRentalVinSet.has(car.vin));
    }
    return cars.filter((car) => {
      const model = modelByName[car.model_name];
      return (
        !openRentalVinSet.has(car.vin)
        && car.location_id === selectedReservation.location_id
        && model?.class_id === selectedReservation.class_id
      );
    });
  }, [cars, modelByName, openRentalVinSet, rentalForm.reservation_id, reservationById]);

  const staffStats = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    const utilization = dashboard.totals.total_cars > 0
      ? (dashboard.totals.rented_cars / dashboard.totals.total_cars) * 100
      : 0;

    return [
      { label: "Fleet", value: dashboard.totals.total_cars },
      { label: "Available", value: dashboard.totals.available_cars },
      { label: "Rented", value: dashboard.totals.rented_cars },
      { label: "Reserved", value: dashboard.totals.reserved_requests },
      { label: "Utilization", value: formatPercent(utilization) }
    ];
  }, [dashboard]);

  const managerAlerts = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    return [
      ...dashboard.active_rentals.filter((item) => item.is_overdue).map((item) => ({
        id: item.contract_no,
        title: `Overdue return ${item.vin}`,
        subtitle: item.location_name,
        meta: `Started ${formatDateTime(item.rental_start_date_time)}`
      })),
      ...dashboard.upcoming_pickups.map((item) => ({
        id: item.reservation_id,
        title: `Pickup due at ${item.location_name}`,
        subtitle: formatDateTime(item.pickup_date_time),
        meta: item.reservation_status
      }))
    ];
  }, [dashboard]);

  useEffect(() => {
    if (!authSession) {
      return;
    }
    setActiveTab(DEFAULT_TAB_BY_ROLE[authSession.role] || "book");
    if (authSession.role === "customer") {
      void refreshCustomerPortal();
    } else {
      void refreshStaffData();
    }
  }, [authSession]);

  async function refreshStaffData() {
    setLoadingData(true);
    setError("");
    try {
      const [
        customerData,
        locationData,
        classData,
        modelData,
        carData,
        reservationData,
        rentalData,
        dashboardData
      ] = await Promise.all([
        apiRequest("/api/v1/customers"),
        apiRequest("/api/v1/locations"),
        apiRequest("/api/v1/car-classes"),
        apiRequest("/api/v1/models"),
        apiRequest("/api/v1/cars"),
        apiRequest("/api/v1/reservations"),
        apiRequest("/api/v1/rental-agreements"),
        apiRequest(DASHBOARD_PATH)
      ]);

      setCustomers(customerData);
      setLocations(locationData);
      setCarClasses(classData);
      setModels(modelData);
      setCars(carData);
      setReservations(reservationData);
      setRentalAgreements(rentalData);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err.message || "Could not load staff data.");
    } finally {
      setLoadingData(false);
      setLoadingDashboard(false);
    }
  }

  async function refreshCustomerPortal() {
    setLoadingData(true);
    setError("");
    try {
      const catalog = await apiRequest("/api/v1/customer-portal/catalog");
      setCustomerCatalog(catalog);
      setLocations(catalog.locations);
      setCarClasses(catalog.car_classes);

      if (customerPortalId) {
        const summary = await apiRequest(`/api/v1/customer-portal/summary/${customerPortalId}`);
        setCustomerSummary(summary);
      } else {
        setCustomerSummary(null);
      }
    } catch (err) {
      setError(err.message || "Could not load customer portal data.");
    } finally {
      setLoadingData(false);
    }
  }

  function showSuccess(message) {
    setSuccess(message);
    setError("");
  }

  async function login(event) {
    event.preventDefault();
    setLoggingIn(true);
    setError("");
    try {
      const session = await apiRequest("/api/v1/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify(loginForm)
      });
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      setAuthSession(session);
      showSuccess(`Signed in as ${session.role}.`);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setSuccess("");
    setError("");
  }

  async function createCustomerBooking(event) {
    event.preventDefault();
    try {
      const payload = await apiRequest("/api/v1/customer-portal/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...customerBookingForm,
          pickup_date_time: new Date(customerBookingForm.pickup_date_time).toISOString(),
          return_date_time_requested: new Date(customerBookingForm.return_date_time_requested).toISOString(),
          exp_month: Number(customerBookingForm.exp_month),
          exp_year: Number(customerBookingForm.exp_year)
        })
      });
      window.localStorage.setItem(CUSTOMER_STORAGE_KEY, payload.customer_id);
      setCustomerPortalId(payload.customer_id);
      setCustomerBookingForm(DEFAULT_CUSTOMER_BOOKING_FORM);
      showSuccess(`Reservation booked for ${payload.reservation.reservation_id.slice(0, 8)}.`);
      await refreshCustomerPortal();
      setActiveTab("trip");
    } catch (err) {
      setError(err.message || "Could not complete booking.");
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    try {
      const created = await apiRequest("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ ...customerForm, exp_month: Number(customerForm.exp_month), exp_year: Number(customerForm.exp_year) })
      });
      setCustomerForm(DEFAULT_CUSTOMER_FORM);
      setReservationForm((previous) => ({ ...previous, customer_id: created.customer_id }));
      showSuccess(`Customer created: ${created.first_name} ${created.last_name}`);
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create customer.");
    }
  }

  async function createReservation(event) {
    event.preventDefault();
    try {
      const created = await apiRequest("/api/v1/reservations", {
        method: "POST",
        body: JSON.stringify({
          ...reservationForm,
          pickup_date_time: new Date(reservationForm.pickup_date_time).toISOString(),
          return_date_time_requested: new Date(reservationForm.return_date_time_requested).toISOString()
        })
      });
      setReservationForm(DEFAULT_RESERVATION_FORM);
      setRentalForm((previous) => ({ ...previous, reservation_id: created.reservation_id }));
      showSuccess(`Reservation created: ${created.reservation_id.slice(0, 8)}`);
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create reservation.");
    }
  }

  async function createRentalAgreement(event) {
    event.preventDefault();
    try {
      const created = await apiRequest("/api/v1/rental-agreements", {
        method: "POST",
        body: JSON.stringify({
          ...rentalForm,
          rental_start_date_time: new Date(rentalForm.rental_start_date_time).toISOString(),
          start_odometer_reading: Number(rentalForm.start_odometer_reading)
        })
      });
      setRentalForm(DEFAULT_RENTAL_FORM);
      setReturnForm((previous) => ({ ...previous, contract_no: created.contract_no }));
      showSuccess(`Pickup complete. Contract ${created.contract_no.slice(0, 8)} is active.`);
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create rental agreement.");
    }
  }

  async function updateReservationStatus(event) {
    event.preventDefault();
    try {
      await apiRequest(`/api/v1/reservations/${reservationStatusForm.reservation_id}`, {
        method: "PUT",
        body: JSON.stringify({ reservation_status: reservationStatusForm.reservation_status })
      });
      setReservationStatusForm({ reservation_id: "", reservation_status: "CANCELED" });
      showSuccess(`Reservation marked ${reservationStatusForm.reservation_status}.`);
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to update reservation status.");
    }
  }

  async function closeRentalAgreement(event) {
    event.preventDefault();
    try {
      const payload = {
        rental_end_date_time: new Date(returnForm.rental_end_date_time).toISOString(),
        end_odometer_reading: Number(returnForm.end_odometer_reading)
      };
      if (returnForm.actual_cost) {
        payload.actual_cost = Number(returnForm.actual_cost);
      }
      await apiRequest(`/api/v1/rental-agreements/${returnForm.contract_no}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setReturnForm(DEFAULT_RETURN_FORM);
      showSuccess("Rental closed and billed.");
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to close rental.");
    }
  }

  async function createLocation(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/locations", { method: "POST", body: JSON.stringify(locationForm) });
      setLocationForm({ street: "", city: "", state: "", zip: "" });
      showSuccess("Location created.");
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create location.");
    }
  }

  async function createCarClass(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/car-classes", {
        method: "POST",
        body: JSON.stringify({
          class_name: classForm.class_name,
          daily_rate: Number(classForm.daily_rate),
          weekly_rate: Number(classForm.weekly_rate)
        })
      });
      setClassForm({ class_name: "", daily_rate: "", weekly_rate: "" });
      showSuccess("Car class created.");
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create class.");
    }
  }

  async function createModel(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/models", {
        method: "POST",
        body: JSON.stringify({
          model_name: modelForm.model_name,
          make_name: modelForm.make_name,
          model_year: Number(modelForm.model_year),
          class_id: modelForm.class_id
        })
      });
      setModelForm({ model_name: "", make_name: "", model_year: "", class_id: "" });
      showSuccess("Model created.");
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create model.");
    }
  }

  async function createCar(event) {
    event.preventDefault();
    try {
      await apiRequest("/api/v1/cars", {
        method: "POST",
        body: JSON.stringify({
          vin: carForm.vin,
          current_odometer_reading: Number(carForm.current_odometer_reading),
          location_id: carForm.location_id,
          model_name: carForm.model_name
        })
      });
      setCarForm({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });
      showSuccess("Car added to fleet.");
      await refreshStaffData();
    } catch (err) {
      setError(err.message || "Failed to create car.");
    }
  }

  async function deleteResource(path, label) {
    if (!window.confirm(`Delete ${label}?`)) {
      return;
    }
    try {
      await apiRequest(path, { method: "DELETE" });
      showSuccess(`${label} deleted.`);
      await refreshStaffData();
    } catch (err) {
      setError(err.message || `Failed to delete ${label}.`);
    }
  }

  if (!authSession) {
    return (
      <div className="login-shell">
        <section className="login-panel">
          <div className="login-copy">
            <p className="eyebrow">Mobile-First Rentals</p>
            <h1>Sign in by persona</h1>
            <p>Each persona lands in a different workflow surface with clear separation of duties and BPMN-aligned visibility.</p>
            <div className="persona-cards">
              {Object.entries(ROLE_COPY).map(([personaRole, copy]) => (
                <button
                  key={personaRole}
                  type="button"
                  className={loginForm.username === personaRole ? "persona-card active" : "persona-card"}
                  onClick={() => setLoginForm({
                    username: personaRole,
                    password: `${personaRole}123`
                  })}
                >
                  <strong>{copy.title}</strong>
                  <span>{copy.subtitle}</span>
                </button>
              ))}
            </div>
          </div>
          <form onSubmit={login} className="login-form">
            <AlertStrip error={error} success={success} />
            <label>
              Username
              <input aria-label="Username" value={loginForm.username} onChange={(event) => setLoginForm((previous) => ({ ...previous, username: event.target.value }))} required />
            </label>
            <label>
              Password
              <input aria-label="Password" type="password" value={loginForm.password} onChange={(event) => setLoginForm((previous) => ({ ...previous, password: event.target.value }))} required />
            </label>
            <button type="submit" disabled={loggingIn}>{loggingIn ? "Signing in..." : "Sign In"}</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <Shell
      title={ROLE_COPY[role].title}
      subtitle={ROLE_COPY[role].subtitle}
      role={role}
      tabs={tabs}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={error} success={success} />
      {loadingData || loadingDashboard ? <div className="loading-strip">Syncing live workflow data…</div> : null}
      {role === "customer" ? (
        <>
          {activeTab === "book" ? (
            <>
              <SectionCard title="Book A Reservation" subtitle="A self-service booking flow with customer details and trip request in one mobile form.">
                <form className="stack-form" onSubmit={createCustomerBooking}>
                  <div className="field-grid two-col">
                    <input placeholder="First name" value={customerBookingForm.first_name} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, first_name: event.target.value }))} required />
                    <input placeholder="Last name" value={customerBookingForm.last_name} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, last_name: event.target.value }))} required />
                    <input placeholder="Street" value={customerBookingForm.street} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, street: event.target.value }))} required />
                    <input placeholder="City" value={customerBookingForm.city} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, city: event.target.value }))} required />
                    <input placeholder="State" value={customerBookingForm.state} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                    <input placeholder="ZIP" value={customerBookingForm.zip} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, zip: event.target.value }))} required />
                    <input placeholder="License number" value={customerBookingForm.license_number} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, license_number: event.target.value }))} required />
                    <input placeholder="License state" value={customerBookingForm.license_state} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, license_state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                    <input placeholder="Card type" value={customerBookingForm.credit_card_type} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, credit_card_type: event.target.value }))} required />
                    <input placeholder="Card number" value={customerBookingForm.credit_card_number} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, credit_card_number: event.target.value }))} required />
                    <input type="number" min="1" max="12" placeholder="Exp month" value={customerBookingForm.exp_month} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, exp_month: event.target.value }))} required />
                    <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={customerBookingForm.exp_year} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, exp_year: event.target.value }))} required />
                  </div>
                  <select value={customerBookingForm.location_id} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, location_id: event.target.value }))} required>
                    <option value="">Pickup branch</option>
                    {customerCatalog.locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state}
                      </option>
                    ))}
                  </select>
                  <select value={customerBookingForm.class_id} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, class_id: event.target.value }))} required>
                    <option value="">Vehicle class</option>
                    {customerCatalog.car_classes.map((item) => (
                      <option key={item.class_id} value={item.class_id}>
                        {item.class_name} · {formatCurrency(item.daily_rate)}/day
                      </option>
                    ))}
                  </select>
                  <label className="stack-label">
                    Pickup
                    <input type="datetime-local" value={customerBookingForm.pickup_date_time} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, pickup_date_time: event.target.value }))} required />
                  </label>
                  <label className="stack-label">
                    Return
                    <input type="datetime-local" value={customerBookingForm.return_date_time_requested} onChange={(event) => setCustomerBookingForm((previous) => ({ ...previous, return_date_time_requested: event.target.value }))} required />
                  </label>
                  <button type="submit">Reserve My Car</button>
                </form>
              </SectionCard>
              <WorkflowTracker stages={customerCatalog.workflow} activeIndex={0} title="Customer journey BPMN" />
            </>
          ) : null}

          {activeTab === "trip" ? (
            <>
              <SectionCard
                title="My Reservation And Rental"
                subtitle="The case timeline shows who owns the next task and where the trip sits in the workflow."
                actions={<button type="button" className="ghost-button" onClick={refreshCustomerPortal}>Refresh</button>}
              >
                {customerSummary ? (
                  <div className="stack-area">
                    <div className="identity-card">
                      <strong>{customerSummary.customer.first_name} {customerSummary.customer.last_name}</strong>
                      <span>{customerSummary.customer.license_state}-{customerSummary.customer.license_number}</span>
                    </div>
                    <QueueList
                      title="Reservations"
                      items={customerSummary.reservations.map((item) => ({
                        id: item.reservation_id,
                        title: `${classById[item.class_id]?.class_name || "Trip"} · ${item.reservation_status}`,
                        subtitle: `${formatDateTime(item.pickup_date_time)} to ${formatDateTime(item.return_date_time_requested)}`,
                        meta: `${locationById[item.location_id]?.city || "Branch"}`
                      }))}
                      emptyText="No reservations created yet."
                    />
                    <QueueList
                      title="Active rentals"
                      items={customerSummary.active_rentals.map((item) => ({
                        id: item.contract_no,
                        title: `Contract ${item.contract_no.slice(0, 8)}`,
                        subtitle: `${item.vin} · started ${formatDateTime(item.rental_start_date_time)}`,
                        meta: item.rental_end_date_time ? "Closed" : "In progress"
                      }))}
                      emptyText="No active rental at the moment."
                    />
                    <WorkflowTracker
                      stages={customerSummary.workflow}
                      activeIndex={customerSummary.active_rentals[0] ? rentalStepIndex(customerSummary.active_rentals[0]) : reservationStepIndex(customerSummary.reservations[0]?.reservation_status)}
                      title="Current process state"
                    />
                  </div>
                ) : (
                  <div className="empty-block">Book your first trip to unlock reservation and rental tracking.</div>
                )}
              </SectionCard>
            </>
          ) : null}

          {activeTab === "workflow" ? (
            <SectionCard title="Workflow Visibility" subtitle="A BPMN-aligned mobile workflow view showing handoffs between customer, agent, and system steps.">
              <WorkflowTracker stages={customerCatalog.workflow.length ? customerCatalog.workflow : STAFF_WORKFLOW} activeIndex={1} title="Reservation to return flow" />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {role === "agent" ? (
        <>
          {activeTab === "queue" ? (
            <>
              <StatGrid stats={staffStats} />
              <SectionCard title="Action queues" subtitle="Mobile-friendly cards for what the branch needs now.">
                <div className="queue-grid">
                  <QueueList
                    title="Active reservations"
                    items={activeReservations.slice(0, 6).map((item) => ({
                      id: item.reservation_id,
                      title: `${customerById[item.customer_id]?.first_name || "Customer"} ${customerById[item.customer_id]?.last_name || ""}`.trim(),
                      subtitle: `${formatDateTime(item.pickup_date_time)} · ${locationById[item.location_id]?.city || "Branch"}`,
                      meta: classById[item.class_id]?.class_name
                    }))}
                    emptyText="No active reservations waiting."
                  />
                  <QueueList
                    title="Open rentals"
                    items={openRentals.slice(0, 6).map((item) => ({
                      id: item.contract_no,
                      title: `${item.vin} · contract ${item.contract_no.slice(0, 8)}`,
                      subtitle: formatDateTime(item.rental_start_date_time),
                      meta: "Return pending"
                    }))}
                    emptyText="No vehicles currently out."
                  />
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === "intake" ? (
            <>
              <SectionCard title="Customer Intake" subtitle="Create a customer record first, then immediately create the reservation.">
                <form className="stack-form" onSubmit={createCustomer}>
                  <div className="field-grid two-col">
                    <input placeholder="First name" value={customerForm.first_name} onChange={(event) => setCustomerForm((previous) => ({ ...previous, first_name: event.target.value }))} required />
                    <input placeholder="Last name" value={customerForm.last_name} onChange={(event) => setCustomerForm((previous) => ({ ...previous, last_name: event.target.value }))} required />
                    <input placeholder="Street" value={customerForm.street} onChange={(event) => setCustomerForm((previous) => ({ ...previous, street: event.target.value }))} required />
                    <input placeholder="City" value={customerForm.city} onChange={(event) => setCustomerForm((previous) => ({ ...previous, city: event.target.value }))} required />
                    <input placeholder="State" value={customerForm.state} onChange={(event) => setCustomerForm((previous) => ({ ...previous, state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                    <input placeholder="ZIP" value={customerForm.zip} onChange={(event) => setCustomerForm((previous) => ({ ...previous, zip: event.target.value }))} required />
                    <input placeholder="License number" value={customerForm.license_number} onChange={(event) => setCustomerForm((previous) => ({ ...previous, license_number: event.target.value }))} required />
                    <input placeholder="License state" value={customerForm.license_state} onChange={(event) => setCustomerForm((previous) => ({ ...previous, license_state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                    <input placeholder="Card type" value={customerForm.credit_card_type} onChange={(event) => setCustomerForm((previous) => ({ ...previous, credit_card_type: event.target.value }))} required />
                    <input placeholder="Card number" value={customerForm.credit_card_number} onChange={(event) => setCustomerForm((previous) => ({ ...previous, credit_card_number: event.target.value }))} required />
                    <input type="number" min="1" max="12" placeholder="Exp month" value={customerForm.exp_month} onChange={(event) => setCustomerForm((previous) => ({ ...previous, exp_month: event.target.value }))} required />
                    <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={customerForm.exp_year} onChange={(event) => setCustomerForm((previous) => ({ ...previous, exp_year: event.target.value }))} required />
                  </div>
                  <button type="submit">Create Customer</button>
                </form>
              </SectionCard>
              <SectionCard title="Reservation Intake" subtitle="Complete the reservation after customer creation or lookup.">
                <form className="stack-form" onSubmit={createReservation}>
                  <select value={reservationForm.customer_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, customer_id: event.target.value }))} required>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.first_name} {customer.last_name}
                      </option>
                    ))}
                  </select>
                  <select value={reservationForm.location_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, location_id: event.target.value }))} required>
                    <option value="">Pickup branch</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state}
                      </option>
                    ))}
                  </select>
                  <select value={reservationForm.class_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, class_id: event.target.value }))} required>
                    <option value="">Car class</option>
                    {carClasses.map((carClass) => (
                      <option key={carClass.class_id} value={carClass.class_id}>
                        {carClass.class_name}
                      </option>
                    ))}
                  </select>
                  <label className="stack-label">
                    Pickup
                    <input type="datetime-local" value={reservationForm.pickup_date_time} onChange={(event) => setReservationForm((previous) => ({ ...previous, pickup_date_time: event.target.value }))} required />
                  </label>
                  <label className="stack-label">
                    Return
                    <input type="datetime-local" value={reservationForm.return_date_time_requested} onChange={(event) => setReservationForm((previous) => ({ ...previous, return_date_time_requested: event.target.value }))} required />
                  </label>
                  <button type="submit">Create Reservation</button>
                </form>
              </SectionCard>
            </>
          ) : null}

          {activeTab === "pickup" ? (
            <SectionCard title="Pickup And Vehicle Assignment" subtitle="Only matching branch and class vehicles appear for the selected reservation.">
              <form className="stack-form" onSubmit={createRentalAgreement}>
                <select value={rentalForm.reservation_id} onChange={(event) => setRentalForm((previous) => ({ ...previous, reservation_id: event.target.value }))} required>
                  <option value="">Active reservation</option>
                  {activeReservations.map((reservation) => (
                    <option key={reservation.reservation_id} value={reservation.reservation_id}>
                      {customerById[reservation.customer_id]?.first_name || "Customer"} · {locationById[reservation.location_id]?.city || "Branch"}
                    </option>
                  ))}
                </select>
                <select value={rentalForm.vin} onChange={(event) => setRentalForm((previous) => ({ ...previous, vin: event.target.value }))} required>
                  <option value="">Assignable vehicle</option>
                  {assignableCars.map((car) => (
                    <option key={car.vin} value={car.vin}>
                      {car.vin} · {car.model_name}
                    </option>
                  ))}
                </select>
                <label className="stack-label">
                  Rental start
                  <input type="datetime-local" value={rentalForm.rental_start_date_time} onChange={(event) => setRentalForm((previous) => ({ ...previous, rental_start_date_time: event.target.value }))} required />
                </label>
                <input type="number" min="0" placeholder="Start odometer" value={rentalForm.start_odometer_reading} onChange={(event) => setRentalForm((previous) => ({ ...previous, start_odometer_reading: event.target.value }))} required />
                <button type="submit">Start Rental</button>
              </form>
            </SectionCard>
          ) : null}

          {activeTab === "return" ? (
            <>
              <SectionCard title="Return And Billing" subtitle="Close a contract and finalize billing from a single mobile flow.">
                <form className="stack-form" onSubmit={closeRentalAgreement}>
                  <select value={returnForm.contract_no} onChange={(event) => setReturnForm((previous) => ({ ...previous, contract_no: event.target.value }))} required>
                    <option value="">Open contract</option>
                    {openRentals.map((agreement) => (
                      <option key={agreement.contract_no} value={agreement.contract_no}>
                        {agreement.vin} · {agreement.contract_no.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <label className="stack-label">
                    Rental end
                    <input type="datetime-local" value={returnForm.rental_end_date_time} onChange={(event) => setReturnForm((previous) => ({ ...previous, rental_end_date_time: event.target.value }))} required />
                  </label>
                  <input type="number" min="0" placeholder="End odometer" value={returnForm.end_odometer_reading} onChange={(event) => setReturnForm((previous) => ({ ...previous, end_odometer_reading: event.target.value }))} required />
                  <input type="number" min="0" step="0.01" placeholder="Actual cost override (optional)" value={returnForm.actual_cost} onChange={(event) => setReturnForm((previous) => ({ ...previous, actual_cost: event.target.value }))} />
                  <button type="submit">Close And Bill</button>
                </form>
              </SectionCard>
              <SectionCard title="Cancellation / No Show" subtitle="Resolve exceptions directly from the branch workflow queue.">
                <form className="stack-form" onSubmit={updateReservationStatus}>
                  <select value={reservationStatusForm.reservation_id} onChange={(event) => setReservationStatusForm((previous) => ({ ...previous, reservation_id: event.target.value }))} required>
                    <option value="">Reservation</option>
                    {activeReservations.map((reservation) => (
                      <option key={reservation.reservation_id} value={reservation.reservation_id}>
                        {customerById[reservation.customer_id]?.first_name || "Customer"} · {reservation.reservation_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                  <select value={reservationStatusForm.reservation_status} onChange={(event) => setReservationStatusForm((previous) => ({ ...previous, reservation_status: event.target.value }))}>
                    <option value="CANCELED">Canceled</option>
                    <option value="NO_SHOW">No show</option>
                  </select>
                  <button type="submit">Update Reservation</button>
                </form>
              </SectionCard>
            </>
          ) : null}
        </>
      ) : null}

      {role === "manager" ? (
        <>
          {activeTab === "overview" ? (
            <>
              <StatGrid stats={staffStats} />
              <SectionCard title="Branch visibility" subtitle="Monitor utilization, class mix, and branch readiness from a compact mobile dashboard.">
                <div className="queue-grid">
                  <QueueList
                    title="Locations"
                    items={(dashboard?.locations || []).map((item) => ({
                      id: item.location_id,
                      title: item.location_name,
                      subtitle: `${item.available_cars} available · ${item.rented_cars} rented`,
                      meta: `${formatPercent(item.utilization_percent)} utilized`
                    }))}
                    emptyText="No branch data loaded."
                  />
                  <QueueList
                    title="Class rates"
                    items={(dashboard?.rates || []).map((item) => ({
                      id: item.class_id,
                      title: item.class_name,
                      subtitle: `${formatCurrency(item.daily_rate)} day / ${formatCurrency(item.weekly_rate)} week`,
                      meta: `${item.vehicle_count} vehicles`
                    }))}
                    emptyText="No rate data available."
                  />
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === "exceptions" ? (
            <SectionCard title="Workflow Exceptions" subtitle="Surface overdue rentals, blocked pickups, and time-sensitive branch work.">
              <QueueList title="Manager alerts" items={managerAlerts} emptyText="No critical workflow exceptions right now." />
            </SectionCard>
          ) : null}

          {activeTab === "workflow" ? (
            <SectionCard title="BPMN Workflow Lens" subtitle="A manager view of the entire reservation-to-return operating model.">
              <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={3} title="Branch workflow" />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {role === "admin" ? (
        <>
          {activeTab === "operations" ? (
            <>
              <StatGrid stats={staffStats} />
              <SectionCard title="Operational Health" subtitle="Admin oversight of live branch activity and configuration-sensitive workflows.">
                <QueueList
                  title="Priority admin watchlist"
                  items={managerAlerts.slice(0, 6)}
                  emptyText="No elevated branch issues."
                />
              </SectionCard>
            </>
          ) : null}

          {activeTab === "inventory" ? (
            <>
              <SectionCard title="Locations And Fleet" subtitle="Manage branch setup and physical inventory from stacked mobile cards.">
                <form className="stack-form" onSubmit={createLocation}>
                  <div className="field-grid two-col">
                    <input placeholder="Street" value={locationForm.street} onChange={(event) => setLocationForm((previous) => ({ ...previous, street: event.target.value }))} required />
                    <input placeholder="City" value={locationForm.city} onChange={(event) => setLocationForm((previous) => ({ ...previous, city: event.target.value }))} required />
                    <input placeholder="State" value={locationForm.state} onChange={(event) => setLocationForm((previous) => ({ ...previous, state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                    <input placeholder="ZIP" value={locationForm.zip} onChange={(event) => setLocationForm((previous) => ({ ...previous, zip: event.target.value }))} required />
                  </div>
                  <button type="submit">Add Location</button>
                </form>
                <form className="stack-form" onSubmit={createCar}>
                  <input placeholder="VIN" minLength={17} maxLength={17} value={carForm.vin} onChange={(event) => setCarForm((previous) => ({ ...previous, vin: event.target.value }))} required />
                  <input type="number" min="0" placeholder="Current odometer" value={carForm.current_odometer_reading} onChange={(event) => setCarForm((previous) => ({ ...previous, current_odometer_reading: event.target.value }))} required />
                  <select value={carForm.location_id} onChange={(event) => setCarForm((previous) => ({ ...previous, location_id: event.target.value }))} required>
                    <option value="">Location</option>
                    {locations.map((location) => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.city}, {location.state}
                      </option>
                    ))}
                  </select>
                  <select value={carForm.model_name} onChange={(event) => setCarForm((previous) => ({ ...previous, model_name: event.target.value }))} required>
                    <option value="">Model</option>
                    {models.map((model) => (
                      <option key={model.model_name} value={model.model_name}>
                        {model.make_name} {model.model_name}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Register Car</button>
                </form>
              </SectionCard>
              <SectionCard title="Current inventory" subtitle="Delete only records that are safe to remove.">
                <QueueList
                  title="Locations"
                  items={locations.map((item) => ({
                    id: item.location_id,
                    title: `${item.city}, ${item.state}`,
                    subtitle: item.street,
                    meta: "Tap delete to remove"
                  }))}
                  emptyText="No locations configured."
                />
                <div className="action-strip">
                  {locations.slice(0, 4).map((item) => (
                    <button key={item.location_id} type="button" className="danger-mini" onClick={() => deleteResource(`/api/v1/locations/${item.location_id}`, `${item.city} location`)}>
                      Delete {item.city}
                    </button>
                  ))}
                </div>
              </SectionCard>
            </>
          ) : null}

          {activeTab === "pricing" ? (
            <>
              <SectionCard title="Pricing And Models" subtitle="Maintain the class-rate matrix and vehicle catalog with admin-only controls.">
                <form className="stack-form" onSubmit={createCarClass}>
                  <input placeholder="Class name" value={classForm.class_name} onChange={(event) => setClassForm((previous) => ({ ...previous, class_name: event.target.value }))} required />
                  <input type="number" min="1" step="0.01" placeholder="Daily rate" value={classForm.daily_rate} onChange={(event) => setClassForm((previous) => ({ ...previous, daily_rate: event.target.value }))} required />
                  <input type="number" min="1" step="0.01" placeholder="Weekly rate" value={classForm.weekly_rate} onChange={(event) => setClassForm((previous) => ({ ...previous, weekly_rate: event.target.value }))} required />
                  <button type="submit">Add Class</button>
                </form>
                <form className="stack-form" onSubmit={createModel}>
                  <input placeholder="Model name" value={modelForm.model_name} onChange={(event) => setModelForm((previous) => ({ ...previous, model_name: event.target.value }))} required />
                  <input placeholder="Make" value={modelForm.make_name} onChange={(event) => setModelForm((previous) => ({ ...previous, make_name: event.target.value }))} required />
                  <input type="number" min="1980" placeholder="Model year" value={modelForm.model_year} onChange={(event) => setModelForm((previous) => ({ ...previous, model_year: event.target.value }))} required />
                  <select value={modelForm.class_id} onChange={(event) => setModelForm((previous) => ({ ...previous, class_id: event.target.value }))} required>
                    <option value="">Class</option>
                    {carClasses.map((carClass) => (
                      <option key={carClass.class_id} value={carClass.class_id}>
                        {carClass.class_name}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Add Model</button>
                </form>
              </SectionCard>
              <SectionCard title="Current pricing" subtitle="Quick reference for rate governance and BPMN support tasks.">
                <QueueList
                  title="Classes"
                  items={carClasses.map((item) => ({
                    id: item.class_id,
                    title: item.class_name,
                    subtitle: `${formatCurrency(item.daily_rate)} day / ${formatCurrency(item.weekly_rate)} week`,
                    meta: "Pricing"
                  }))}
                  emptyText="No classes configured."
                />
              </SectionCard>
            </>
          ) : null}

          {activeTab === "workflow" ? (
            <SectionCard title="Workflow Governance" subtitle="Admin alignment between branch duties, BPMN stages, and the mobile UI surfaces.">
              <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={5} title="Admin BPMN coverage" />
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </Shell>
  );
}
