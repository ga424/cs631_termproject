import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DASHBOARD_PATH = "/api/v1/dashboard/overview";
const AUTH_STORAGE_KEY = "rentacar_staff_auth";

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

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export default function App() {
  const [authSession, setAuthSession] = useState(() => getStoredAuthSession());
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "admin123" });
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

  const [customerForm, setCustomerForm] = useState({
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
  });

  const [reservationForm, setReservationForm] = useState({
    customer_id: "",
    location_id: "",
    class_id: "",
    pickup_date_time: "",
    return_date_time_requested: "",
    reservation_status: "ACTIVE"
  });

  const [rentalForm, setRentalForm] = useState({
    reservation_id: "",
    vin: "",
    rental_start_date_time: "",
    start_odometer_reading: ""
  });

  const [reservationStatusForm, setReservationStatusForm] = useState({
    reservation_id: "",
    reservation_status: "CANCELED"
  });

  const [returnForm, setReturnForm] = useState({
    contract_no: "",
    rental_end_date_time: "",
    end_odometer_reading: "",
    actual_cost: ""
  });

  const [locationForm, setLocationForm] = useState({ street: "", city: "", state: "", zip: "" });
  const [classForm, setClassForm] = useState({ class_name: "", daily_rate: "", weekly_rate: "" });
  const [modelForm, setModelForm] = useState({ model_name: "", make_name: "", model_year: "", class_id: "" });
  const [carForm, setCarForm] = useState({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });

  const classRateById = useMemo(() => {
    return carClasses.reduce((acc, cls) => {
      acc[cls.class_id] = cls;
      return acc;
    }, {});
  }, [carClasses]);

  const reservationById = useMemo(() => {
    return reservations.reduce((acc, reservation) => {
      acc[reservation.reservation_id] = reservation;
      return acc;
    }, {});
  }, [reservations]);

  const customerById = useMemo(() => {
    return customers.reduce((acc, customer) => {
      acc[customer.customer_id] = customer;
      return acc;
    }, {});
  }, [customers]);

  const locationById = useMemo(() => {
    return locations.reduce((acc, location) => {
      acc[location.location_id] = location;
      return acc;
    }, {});
  }, [locations]);

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => reservation.reservation_status === "ACTIVE"),
    [reservations]
  );

  const openRentals = useMemo(
    () => rentalAgreements.filter((agreement) => !agreement.rental_end_date_time),
    [rentalAgreements]
  );

  const stats = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    const { totals } = dashboard;
    const utilization =
      totals.total_cars > 0 ? (totals.rented_cars / totals.total_cars) * 100 : 0;

    return [
      { label: "Total Fleet", value: totals.total_cars },
      { label: "Available", value: totals.available_cars },
      { label: "Rented", value: totals.rented_cars },
      { label: "Reserved Requests", value: totals.reserved_requests },
      { label: "Utilization", value: formatPercent(utilization) }
    ];
  }, [dashboard]);

  const rateStats = useMemo(() => {
    if (!dashboard?.rates?.length) {
      return [];
    }

    const dailyRates = dashboard.rates.map((rate) => Number(rate.daily_rate));
    const weeklyRates = dashboard.rates.map((rate) => Number(rate.weekly_rate));
    const averageDaily = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;
    const averageWeekly = weeklyRates.reduce((sum, rate) => sum + rate, 0) / weeklyRates.length;

    return [
      { label: "Lowest Daily", value: formatCurrency(Math.min(...dailyRates)) },
      { label: "Highest Daily", value: formatCurrency(Math.max(...dailyRates)) },
      { label: "Average Daily", value: formatCurrency(averageDaily) },
      { label: "Average Weekly", value: formatCurrency(averageWeekly) }
    ];
  }, [dashboard]);

  const selectedRate = classRateById[reservationForm.class_id];

  const selectedRentalClass = useMemo(() => {
    const reservation = reservationById[returnForm.contract_no ? openRentals.find((item) => item.contract_no === returnForm.contract_no)?.reservation_id : ""];
    if (!reservation) {
      return null;
    }
    return classRateById[reservation.class_id] || null;
  }, [classRateById, openRentals, reservationById, returnForm.contract_no]);

  const isAdmin = authSession?.role === "admin";

  useEffect(() => {
    if (authSession) {
      void refreshOperationalData();
    }
  }, [authSession]);

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
      showSuccess(`Signed in as ${session.username} (${session.role}).`);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthSession(null);
    setDashboard(null);
    setCustomers([]);
    setLocations([]);
    setCarClasses([]);
    setModels([]);
    setCars([]);
    setReservations([]);
    setRentalAgreements([]);
    setSuccess("");
    setError("");
  }

  async function refreshOperationalData() {
    setLoadingData(true);
    setError("");

    try {
      const [customerData, locationData, classData, modelData, carData, reservationData, rentalData] = await Promise.all([
        apiRequest("/api/v1/customers"),
        apiRequest("/api/v1/locations"),
        apiRequest("/api/v1/car-classes"),
        apiRequest("/api/v1/models"),
        apiRequest("/api/v1/cars"),
        apiRequest("/api/v1/reservations"),
        apiRequest("/api/v1/rental-agreements")
      ]);

      setCustomers(customerData);
      setLocations(locationData);
      setCarClasses(classData);
      setModels(modelData);
      setCars(carData);
      setReservations(reservationData);
      setRentalAgreements(rentalData);
    } catch (err) {
      setError(err.message || "Could not load operational data.");
    } finally {
      setLoadingData(false);
    }
  }

  function showSuccess(message) {
    setSuccess(message);
    setError("");
  }

  async function loadData() {
    setLoadingDashboard(true);
    setError("");

    try {
      const payload = await apiRequest(DASHBOARD_PATH);
      setDashboard(payload);
    } catch (err) {
      setError(err.message || "Could not load data from API.");
    } finally {
      setLoadingDashboard(false);
    }
  }

  async function createCustomer(event) {
    event.preventDefault();
    try {
      const created = await apiRequest("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({
          ...customerForm,
          exp_month: Number(customerForm.exp_month),
          exp_year: Number(customerForm.exp_year)
        })
      });
      setReservationForm((previous) => ({ ...previous, customer_id: created.customer_id }));
      showSuccess(`Customer created: ${created.first_name} ${created.last_name}`);
      await refreshOperationalData();
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
      setRentalForm((previous) => ({ ...previous, reservation_id: created.reservation_id }));
      setReservationStatusForm((previous) => ({ ...previous, reservation_id: created.reservation_id }));
      showSuccess(`Reservation created: ${created.reservation_id}`);
      await refreshOperationalData();
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
      setReturnForm((previous) => ({ ...previous, contract_no: created.contract_no }));
      showSuccess(`Rental agreement created: ${created.contract_no}`);
      await refreshOperationalData();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create rental agreement.");
    }
  }

  async function updateReservationStatus(event) {
    event.preventDefault();
    if (!reservationStatusForm.reservation_id) {
      setError("Select a reservation first.");
      return;
    }

    try {
      await apiRequest(`/api/v1/reservations/${reservationStatusForm.reservation_id}`, {
        method: "PUT",
        body: JSON.stringify({ reservation_status: reservationStatusForm.reservation_status })
      });
      showSuccess(`Reservation marked as ${reservationStatusForm.reservation_status}`);
      await refreshOperationalData();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to update reservation status.");
    }
  }

  async function closeRentalAgreement(event) {
    event.preventDefault();
    if (!returnForm.contract_no) {
      setError("Select a contract first.");
      return;
    }

    const payload = {
      rental_end_date_time: new Date(returnForm.rental_end_date_time).toISOString(),
      end_odometer_reading: Number(returnForm.end_odometer_reading)
    };

    if (returnForm.actual_cost) {
      payload.actual_cost = Number(returnForm.actual_cost);
    }

    try {
      await apiRequest(`/api/v1/rental-agreements/${returnForm.contract_no}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showSuccess(`Rental ${returnForm.contract_no} closed and billed.`);
      await refreshOperationalData();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to close rental agreement.");
    }
  }

  async function createLocation(event) {
    event.preventDefault();
    if (!isAdmin) {
      setError("Admin role required to create locations.");
      return;
    }

    try {
      await apiRequest("/api/v1/locations", { method: "POST", body: JSON.stringify(locationForm) });
      showSuccess("Location created.");
      await refreshOperationalData();
    } catch (err) {
      setError(err.message || "Failed to create location.");
    }
  }

  async function createCarClass(event) {
    event.preventDefault();
    if (!isAdmin) {
      setError("Admin role required to manage car-class pricing.");
      return;
    }

    try {
      await apiRequest("/api/v1/car-classes", {
        method: "POST",
        body: JSON.stringify({
          class_name: classForm.class_name,
          daily_rate: Number(classForm.daily_rate),
          weekly_rate: Number(classForm.weekly_rate)
        })
      });
      showSuccess("Car class created.");
      await refreshOperationalData();
    } catch (err) {
      setError(err.message || "Failed to create car class.");
    }
  }

  async function createModel(event) {
    event.preventDefault();
    if (!isAdmin) {
      setError("Admin role required to manage vehicle models.");
      return;
    }

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
      showSuccess("Model created.");
      await refreshOperationalData();
    } catch (err) {
      setError(err.message || "Failed to create model.");
    }
  }

  async function createCar(event) {
    event.preventDefault();
    if (!isAdmin) {
      setError("Admin role required to register cars.");
      return;
    }

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
      showSuccess("Car added to fleet.");
      await refreshOperationalData();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create car.");
    }
  }

  if (!authSession) {
    return (
      <div className="page auth-page">
        <section className="auth-shell">
          <div className="auth-copy">
            <p className="eyebrow">RentACar Staff Portal</p>
            <h1>Sign in to run the rental journey</h1>
            <p>
              JWT login separates the primary personas: agents handle customers, reservations,
              pickups, returns, and cancellations; managers monitor fleet operations; admins also
              maintain inventory, models, branches, and pricing.
            </p>
            <div className="persona-grid">
              <div>
                <strong>Agent</strong>
                <span>agent / agent123</span>
              </div>
              <div>
                <strong>Manager</strong>
                <span>manager / manager123</span>
              </div>
              <div>
                <strong>Admin</strong>
                <span>admin / admin123</span>
              </div>
            </div>
          </div>
          <form onSubmit={login} className="login-card">
            <h2>Staff Login</h2>
            {error ? <div className="alert">{error}</div> : null}
            <label className="field-label">
              Username
              <input value={loginForm.username} onChange={(event) => setLoginForm((previous) => ({ ...previous, username: event.target.value }))} required />
            </label>
            <label className="field-label">
              Password
              <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((previous) => ({ ...previous, password: event.target.value }))} required />
            </label>
            <button type="submit" disabled={loggingIn}>{loggingIn ? "Signing in..." : "Sign In"}</button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Operations Center</p>
          <h1>Rental Journey Console</h1>
          <p>Handle calls, walk-ins, pickups, returns, pricing, and branch inventory from one place.</p>
          <div className="session-pill">
            Signed in as {authSession.username} ({authSession.role})
          </div>
        </div>
        <div className="hero-actions">
          <button onClick={refreshOperationalData} disabled={loadingData}>
            {loadingData ? "Syncing..." : "Sync Operations Data"}
          </button>
          <button onClick={loadData} disabled={loadingDashboard}>
            {loadingDashboard ? "Refreshing..." : dashboard ? "Refresh Dashboard" : "Load Dashboard"}
          </button>
          <button type="button" className="secondary-button" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      {!dashboard && !loadingDashboard ? (
        <div className="empty">Load the dashboard to view live fleet metrics.</div>
      ) : null}

      <section className="panel-grid journey-grid">
        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Journey 1-2: Phone Reservation or Walk-In Intake</h3>
            <span>Customer + reservation creation</span>
          </div>
          <div className="form-grid two">
            <form onSubmit={createCustomer} className="form-card">
              <h4>Create Customer</h4>
              <div className="field-grid two">
                <input placeholder="First name" value={customerForm.first_name} onChange={(event) => setCustomerForm((previous) => ({ ...previous, first_name: event.target.value }))} required />
                <input placeholder="Last name" value={customerForm.last_name} onChange={(event) => setCustomerForm((previous) => ({ ...previous, last_name: event.target.value }))} required />
                <input placeholder="Street" value={customerForm.street} onChange={(event) => setCustomerForm((previous) => ({ ...previous, street: event.target.value }))} required />
                <input placeholder="City" value={customerForm.city} onChange={(event) => setCustomerForm((previous) => ({ ...previous, city: event.target.value }))} required />
                <input placeholder="State" value={customerForm.state} onChange={(event) => setCustomerForm((previous) => ({ ...previous, state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="ZIP" value={customerForm.zip} onChange={(event) => setCustomerForm((previous) => ({ ...previous, zip: event.target.value }))} required />
                <input placeholder="License #" value={customerForm.license_number} onChange={(event) => setCustomerForm((previous) => ({ ...previous, license_number: event.target.value }))} required />
                <input placeholder="License State" value={customerForm.license_state} onChange={(event) => setCustomerForm((previous) => ({ ...previous, license_state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="Card Type" value={customerForm.credit_card_type} onChange={(event) => setCustomerForm((previous) => ({ ...previous, credit_card_type: event.target.value }))} required />
                <input placeholder="Card Number" value={customerForm.credit_card_number} onChange={(event) => setCustomerForm((previous) => ({ ...previous, credit_card_number: event.target.value }))} required />
                <input type="number" min="1" max="12" placeholder="Exp month" value={customerForm.exp_month} onChange={(event) => setCustomerForm((previous) => ({ ...previous, exp_month: event.target.value }))} required />
                <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={customerForm.exp_year} onChange={(event) => setCustomerForm((previous) => ({ ...previous, exp_year: event.target.value }))} required />
              </div>
              <button type="submit">Create Customer</button>
            </form>

            <form onSubmit={createReservation} className="form-card">
              <h4>Create Reservation</h4>
              <div className="field-grid">
                <select value={reservationForm.customer_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, customer_id: event.target.value }))} required>
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                      {customer.first_name} {customer.last_name}
                    </option>
                  ))}
                </select>
                <select value={reservationForm.location_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, location_id: event.target.value }))} required>
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.city}, {location.state}
                    </option>
                  ))}
                </select>
                <select value={reservationForm.class_id} onChange={(event) => setReservationForm((previous) => ({ ...previous, class_id: event.target.value }))} required>
                  <option value="">Select class</option>
                  {carClasses.map((carClass) => (
                    <option key={carClass.class_id} value={carClass.class_id}>
                      {carClass.class_name}
                    </option>
                  ))}
                </select>
                <label className="field-label">
                  Pickup Date/Time
                  <input type="datetime-local" value={reservationForm.pickup_date_time} onChange={(event) => setReservationForm((previous) => ({ ...previous, pickup_date_time: event.target.value }))} required />
                </label>
                <label className="field-label">
                  Return Date/Time
                  <input type="datetime-local" value={reservationForm.return_date_time_requested} onChange={(event) => setReservationForm((previous) => ({ ...previous, return_date_time_requested: event.target.value }))} required />
                </label>
              </div>
              {selectedRate ? (
                <div className="hint-box">
                  Rate for {selectedRate.class_name}: {formatCurrency(selectedRate.daily_rate)} daily / {formatCurrency(selectedRate.weekly_rate)} weekly
                </div>
              ) : null}
              <button type="submit">Create Reservation</button>
            </form>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Journey 3: Pickup</h3>
            <span>Convert reservation to rental</span>
          </div>
          <form onSubmit={createRentalAgreement} className="field-grid">
            <select value={rentalForm.reservation_id} onChange={(event) => setRentalForm((previous) => ({ ...previous, reservation_id: event.target.value }))} required>
              <option value="">Active reservation</option>
              {activeReservations.map((reservation) => (
                <option key={reservation.reservation_id} value={reservation.reservation_id}>
                  {reservation.reservation_id.slice(0, 8)} - {locationById[reservation.location_id]?.city || "Unknown"}
                </option>
              ))}
            </select>
            <select value={rentalForm.vin} onChange={(event) => setRentalForm((previous) => ({ ...previous, vin: event.target.value }))} required>
              <option value="">Assign VIN</option>
              {cars.map((car) => (
                <option key={car.vin} value={car.vin}>
                  {car.vin} - {car.model_name}
                </option>
              ))}
            </select>
            <label className="field-label">
              Rental Start
              <input type="datetime-local" value={rentalForm.rental_start_date_time} onChange={(event) => setRentalForm((previous) => ({ ...previous, rental_start_date_time: event.target.value }))} required />
            </label>
            <input type="number" min="0" placeholder="Start odometer" value={rentalForm.start_odometer_reading} onChange={(event) => setRentalForm((previous) => ({ ...previous, start_odometer_reading: event.target.value }))} required />
            <button type="submit">Create Rental Agreement</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Journey 4: Cancellation / No Show</h3>
            <span>Reservation status controls</span>
          </div>
          <form onSubmit={updateReservationStatus} className="field-grid">
            <select value={reservationStatusForm.reservation_id} onChange={(event) => setReservationStatusForm((previous) => ({ ...previous, reservation_id: event.target.value }))} required>
              <option value="">Reservation</option>
              {activeReservations.map((reservation) => {
                const customer = customerById[reservation.customer_id];
                return (
                  <option key={reservation.reservation_id} value={reservation.reservation_id}>
                    {reservation.reservation_id.slice(0, 8)} - {customer ? `${customer.first_name} ${customer.last_name}` : "Unknown customer"}
                  </option>
                );
              })}
            </select>
            <select value={reservationStatusForm.reservation_status} onChange={(event) => setReservationStatusForm((previous) => ({ ...previous, reservation_status: event.target.value }))}>
              <option value="CANCELED">CANCELED</option>
              <option value="NO_SHOW">NO_SHOW</option>
            </select>
            <button type="submit">Update Reservation Status</button>
          </form>
        </article>

        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Journey 5: Return And Billing</h3>
            <span>Capture return details and close contract</span>
          </div>
          <form onSubmit={closeRentalAgreement} className="field-grid four">
            <select value={returnForm.contract_no} onChange={(event) => setReturnForm((previous) => ({ ...previous, contract_no: event.target.value }))} required>
              <option value="">Open contract</option>
              {openRentals.map((agreement) => (
                <option key={agreement.contract_no} value={agreement.contract_no}>
                  {agreement.contract_no.slice(0, 8)} - {agreement.vin}
                </option>
              ))}
            </select>
            <label className="field-label">
              Rental End
              <input type="datetime-local" value={returnForm.rental_end_date_time} onChange={(event) => setReturnForm((previous) => ({ ...previous, rental_end_date_time: event.target.value }))} required />
            </label>
            <input type="number" min="0" placeholder="End odometer" value={returnForm.end_odometer_reading} onChange={(event) => setReturnForm((previous) => ({ ...previous, end_odometer_reading: event.target.value }))} required />
            <input type="number" min="0" step="0.01" placeholder="Actual cost (optional override)" value={returnForm.actual_cost} onChange={(event) => setReturnForm((previous) => ({ ...previous, actual_cost: event.target.value }))} />
            <button type="submit">Close Contract</button>
          </form>
          {selectedRentalClass ? (
            <div className="hint-box">
              Pricing source: {selectedRentalClass.class_name} at {formatCurrency(selectedRentalClass.daily_rate)} daily / {formatCurrency(selectedRentalClass.weekly_rate)} weekly.
            </div>
          ) : null}
        </article>

        {isAdmin ? (
          <article className="panel panel-wide">
            <div className="panel-title-row">
              <h3>Journey 6: Inventory And Pricing Administration</h3>
              <span>Create locations, rates, models, and fleet records</span>
            </div>
            <div className="form-grid two">
              <form onSubmit={createLocation} className="form-card">
                <h4>New Location</h4>
                <div className="field-grid two">
                  <input placeholder="Street" value={locationForm.street} onChange={(event) => setLocationForm((previous) => ({ ...previous, street: event.target.value }))} required />
                  <input placeholder="City" value={locationForm.city} onChange={(event) => setLocationForm((previous) => ({ ...previous, city: event.target.value }))} required />
                  <input placeholder="State" value={locationForm.state} onChange={(event) => setLocationForm((previous) => ({ ...previous, state: event.target.value.toUpperCase().slice(0, 2) }))} required />
                  <input placeholder="ZIP" value={locationForm.zip} onChange={(event) => setLocationForm((previous) => ({ ...previous, zip: event.target.value }))} required />
                </div>
                <button type="submit">Add Location</button>
              </form>

              <form onSubmit={createCarClass} className="form-card">
                <h4>New Car Class</h4>
                <div className="field-grid">
                  <input placeholder="Class name" value={classForm.class_name} onChange={(event) => setClassForm((previous) => ({ ...previous, class_name: event.target.value }))} required />
                  <input type="number" min="1" step="0.01" placeholder="Daily rate" value={classForm.daily_rate} onChange={(event) => setClassForm((previous) => ({ ...previous, daily_rate: event.target.value }))} required />
                  <input type="number" min="1" step="0.01" placeholder="Weekly rate" value={classForm.weekly_rate} onChange={(event) => setClassForm((previous) => ({ ...previous, weekly_rate: event.target.value }))} required />
                </div>
                <button type="submit">Add Class</button>
              </form>

              <form onSubmit={createModel} className="form-card">
                <h4>New Model</h4>
                <div className="field-grid">
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
                </div>
                <button type="submit">Add Model</button>
              </form>

              <form onSubmit={createCar} className="form-card">
                <h4>Register Car</h4>
                <div className="field-grid">
                  <input placeholder="VIN (17 chars)" value={carForm.vin} onChange={(event) => setCarForm((previous) => ({ ...previous, vin: event.target.value }))} minLength={17} maxLength={17} required />
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
                        {model.make_name} {model.model_name} ({model.model_year})
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit">Add Car</button>
              </form>
            </div>
          </article>
        ) : (
          <article className="panel panel-wide">
            <div className="panel-title-row">
              <h3>Journey 6: Inventory And Pricing Administration</h3>
              <span>Admin-only controls</span>
            </div>
            <div className="empty">Sign in as admin to create locations, rates, models, and fleet records.</div>
          </article>
        )}
      </section>

      {dashboard ? (
        <section className="stats-grid" aria-label="Pricing snapshot">
          {rateStats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <h2>{stat.value}</h2>
              <p>{stat.label}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <h2>{stat.value}</h2>
            <p>{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Availability by Location</h3>
            <span>{dashboard?.locations.length || 0} locations</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Total</th>
                  <th>Available</th>
                  <th>Rented</th>
                  <th>Reserved</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.locations || []).map((location) => (
                  <tr key={location.location_id}>
                    <td>{location.location_name}</td>
                    <td>{location.total_cars}</td>
                    <td>{location.available_cars}</td>
                    <td>{location.rented_cars}</td>
                    <td>{location.reserved_requests}</td>
                    <td>{formatPercent(location.utilization_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Class Rates</h3>
            <span>{dashboard?.rates.length || 0} classes</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Daily Rate</th>
                  <th>Weekly Rate</th>
                  <th>Models</th>
                  <th>Vehicles</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.rates || []).map((rate) => (
                  <tr key={rate.class_id}>
                    <td>{rate.class_name}</td>
                    <td>{formatCurrency(rate.daily_rate)}</td>
                    <td>{formatCurrency(rate.weekly_rate)}</td>
                    <td>{rate.model_count}</td>
                    <td>{rate.vehicle_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Active Rentals</h3>
            <span>{dashboard?.active_rentals.length || 0}</span>
          </div>
          <ul className="rich-list">
            {(dashboard?.active_rentals || []).slice(0, 8).map((rental) => (
              <li key={rental.contract_no}>
                <div>
                  <strong>{rental.vin}</strong>
                  <p>{rental.location_name}</p>
                </div>
                <div className={rental.is_overdue ? "pill danger" : "pill"}>
                  {rental.is_overdue ? "Overdue" : "On track"}
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h3>Upcoming Pickups (24h)</h3>
            <span>{dashboard?.upcoming_pickups.length || 0}</span>
          </div>
          <ul className="rich-list">
            {(dashboard?.upcoming_pickups || []).slice(0, 8).map((pickup) => (
              <li key={pickup.reservation_id}>
                <div>
                  <strong>{pickup.location_name}</strong>
                  <p>{formatDateTime(pickup.pickup_date_time)}</p>
                </div>
                <div className="pill">{pickup.reservation_status}</div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel panel-wide">
          <div className="panel-title-row">
            <h3>Fleet Status</h3>
            <span>{dashboard?.fleet.length || 0} vehicles</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>VIN</th>
                  <th>Model</th>
                  <th>Location</th>
                  <th>Odometer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.fleet || []).slice(0, 30).map((car) => (
                  <tr key={car.vin}>
                    <td>{car.vin}</td>
                    <td>{car.model_name}</td>
                    <td>{car.location_name}</td>
                    <td>{car.current_odometer_reading.toLocaleString()}</td>
                    <td>
                      <span className={car.status === "RENTED" ? "pill danger" : "pill"}>
                        {car.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {dashboard ? (
        <footer className="footer-note">Last refresh: {formatDateTime(dashboard.generated_at)}</footer>
      ) : null}
    </div>
  );
}
