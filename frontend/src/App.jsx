import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const endpoints = [
  { key: "health", label: "Health", path: "/health" },
  { key: "customers", label: "Customers", path: "/api/v1/customers" },
  { key: "cars", label: "Cars", path: "/api/v1/cars" },
  { key: "reservations", label: "Reservations", path: "/api/v1/reservations" }
];

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export default function App() {
  const [data, setData] = useState({
    health: null,
    customers: [],
    cars: [],
    reservations: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = useMemo(
    () => [
      { label: "Customers", value: data.customers.length },
      { label: "Cars", value: data.cars.length },
      { label: "Reservations", value: data.reservations.length },
      {
        label: "API Status",
        value: data.health?.status ? data.health.status.toUpperCase() : "UNKNOWN"
      }
    ],
    [data]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [health, customers, cars, reservations] = await Promise.all(
        endpoints.map((endpoint) => fetchJson(endpoint.path))
      );

      setData({ health, customers, cars, reservations });
    } catch (err) {
      setError(err.message || "Could not load data from API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Rental Car Dashboard</h1>
        <p>Simple React frontend for your FastAPI rental system.</p>
        <button onClick={loadData} disabled={loading}>
          {loading ? "Loading..." : "Load Data"}
        </button>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <h2>{stat.value}</h2>
            <p>{stat.label}</p>
          </article>
        ))}
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h3>Customers</h3>
          <ul>
            {data.customers.slice(0, 6).map((customer) => (
              <li key={customer.customer_id}>
                {customer.first_name} {customer.last_name}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Cars</h3>
          <ul>
            {data.cars.slice(0, 6).map((car) => (
              <li key={car.vin}>
                {car.vin} ({car.model_name})
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>Reservations</h3>
          <ul>
            {data.reservations.slice(0, 6).map((reservation) => (
              <li key={reservation.reservation_id}>
                {reservation.reservation_status} - {reservation.reservation_id.slice(0, 8)}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
