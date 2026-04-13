import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const DASHBOARD_PATH = "/api/v1/dashboard/overview";

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
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

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const payload = await fetchJson(DASHBOARD_PATH);
      setDashboard(payload);
    } catch (err) {
      setError(err.message || "Could not load data from API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Operations Center</p>
          <h1>Rental Fleet Dashboard</h1>
          <p>Track where cars are, what is currently rented, and which pickups are coming next.</p>
        </div>
        <button onClick={loadData} disabled={loading}>
          {loading ? "Refreshing..." : dashboard ? "Refresh Dashboard" : "Load Dashboard"}
        </button>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      {!dashboard && !loading ? <div className="empty">Load the dashboard to view live fleet metrics.</div> : null}

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
