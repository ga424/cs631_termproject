import { useMemo, useState } from "react";
import { formatCurrency, formatDateTime } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerPortal } from "../../hooks/useCustomerPortal";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip, QueueList, SectionCard, WorkflowTracker } from "../../components/ui";

const TABS = [
  { id: "book", label: "Book" },
  { id: "trip", label: "My Trip" },
  { id: "workflow", label: "Workflow" },
];

const DEFAULT_FORM = {
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
  exp_month: `${12}`,
  exp_year: `${new Date().getFullYear() + 2}`,
  location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: "",
};

function reservationStepIndex(status?: string) {
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

function rentalStepIndex(hasClosedRental: boolean) {
  return hasClosedRental ? 4 : 3;
}

export function CustomerPortal() {
  const { logout } = useAuth();
  const { catalog, summary, loading, error, success, setError, createBooking, refresh } = useCustomerPortal();
  const [activeTab, setActiveTab] = useState("book");
  const [form, setForm] = useState(DEFAULT_FORM);

  const locationById = useMemo(() => Object.fromEntries(catalog.locations.map((item) => [item.location_id, item])), [catalog.locations]);
  const classById = useMemo(() => Object.fromEntries(catalog.car_classes.map((item) => [item.class_id, item])), [catalog.car_classes]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createBooking({
        ...form,
        exp_month: Number(form.exp_month),
        exp_year: Number(form.exp_year),
        pickup_date_time: new Date(form.pickup_date_time).toISOString(),
        return_date_time_requested: new Date(form.return_date_time_requested).toISOString(),
      });
      setForm(DEFAULT_FORM);
      setActiveTab("trip");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete booking.");
    }
  }

  return (
    <MobileLayout
      title="Customer Portal"
      subtitle="Book a trip, follow your reservation, and track your active rental from a mobile-first experience."
      role="customer"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={error} success={success} />
      {loading ? <div className="loading-strip">Syncing customer data…</div> : null}
      {activeTab === "book" ? (
        <>
          <SectionCard title="Book A Reservation" subtitle="A self-service booking flow with identity, payment, and trip details in one mobile form.">
            <form className="stack-form" onSubmit={submit}>
              <div className="field-grid two-col">
                <input placeholder="First name" value={form.first_name} onChange={(e) => setForm((current) => ({ ...current, first_name: e.target.value }))} required />
                <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((current) => ({ ...current, last_name: e.target.value }))} required />
                <input placeholder="Street" value={form.street} onChange={(e) => setForm((current) => ({ ...current, street: e.target.value }))} required />
                <input placeholder="City" value={form.city} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))} required />
                <input placeholder="State" value={form.state} onChange={(e) => setForm((current) => ({ ...current, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="ZIP" value={form.zip} onChange={(e) => setForm((current) => ({ ...current, zip: e.target.value }))} required />
                <input placeholder="License number" value={form.license_number} onChange={(e) => setForm((current) => ({ ...current, license_number: e.target.value }))} required />
                <input placeholder="License state" value={form.license_state} onChange={(e) => setForm((current) => ({ ...current, license_state: e.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="Card type" value={form.credit_card_type} onChange={(e) => setForm((current) => ({ ...current, credit_card_type: e.target.value }))} required />
                <input placeholder="Card number" value={form.credit_card_number} onChange={(e) => setForm((current) => ({ ...current, credit_card_number: e.target.value }))} required />
                <input type="number" min="1" max="12" placeholder="Exp month" value={form.exp_month} onChange={(e) => setForm((current) => ({ ...current, exp_month: e.target.value }))} required />
                <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={form.exp_year} onChange={(e) => setForm((current) => ({ ...current, exp_year: e.target.value }))} required />
              </div>
              <select value={form.location_id} onChange={(e) => setForm((current) => ({ ...current, location_id: e.target.value }))} required>
                <option value="">Pickup branch</option>
                {catalog.locations.map((item) => (
                  <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>
                ))}
              </select>
              <select value={form.class_id} onChange={(e) => setForm((current) => ({ ...current, class_id: e.target.value }))} required>
                <option value="">Vehicle class</option>
                {catalog.car_classes.map((item) => (
                  <option key={item.class_id} value={item.class_id}>{item.class_name} · {formatCurrency(item.daily_rate)}/day</option>
                ))}
              </select>
              <label className="stack-label">
                Pickup
                <input type="datetime-local" value={form.pickup_date_time} onChange={(e) => setForm((current) => ({ ...current, pickup_date_time: e.target.value }))} required />
              </label>
              <label className="stack-label">
                Return
                <input type="datetime-local" value={form.return_date_time_requested} onChange={(e) => setForm((current) => ({ ...current, return_date_time_requested: e.target.value }))} required />
              </label>
              <button type="submit">Reserve My Car</button>
            </form>
          </SectionCard>
          <WorkflowTracker stages={catalog.workflow} activeIndex={0} title="Customer journey BPMN" />
        </>
      ) : null}

      {activeTab === "trip" ? (
        <SectionCard
          title="My Reservation And Rental"
          subtitle="The case timeline shows who owns the next task and where the trip sits in the workflow."
          actions={<button type="button" className="ghost-button" onClick={() => void refresh()}>Refresh</button>}
        >
          {summary ? (
            <div className="stack-area">
              <div className="identity-card">
                <strong>{summary.customer.first_name} {summary.customer.last_name}</strong>
                <span>{summary.customer.license_state}-{summary.customer.license_number}</span>
              </div>
              <QueueList
                title="Reservations"
                items={summary.reservations.map((item) => ({
                  id: item.reservation_id,
                  title: `${classById[item.class_id]?.class_name || "Trip"} · ${item.reservation_status}`,
                  subtitle: `${formatDateTime(item.pickup_date_time)} to ${formatDateTime(item.return_date_time_requested)}`,
                  meta: locationById[item.location_id] ? `${locationById[item.location_id].city}, ${locationById[item.location_id].state}` : "Branch",
                }))}
                emptyText="No reservations created yet."
              />
              <QueueList
                title="Active rentals"
                items={summary.active_rentals.map((item) => ({
                  id: item.contract_no,
                  title: `Contract ${item.contract_no.slice(0, 8)}`,
                  subtitle: `${item.vin} · started ${formatDateTime(item.rental_start_date_time)}`,
                  meta: item.rental_end_date_time ? "Closed" : "In progress",
                }))}
                emptyText="No active rental at the moment."
              />
              <WorkflowTracker
                stages={summary.workflow}
                activeIndex={
                  summary.active_rentals[0]
                    ? rentalStepIndex(Boolean(summary.active_rentals[0].rental_end_date_time))
                    : reservationStepIndex(summary.reservations[0]?.reservation_status)
                }
                title="Trip status"
              />
            </div>
          ) : (
            <div className="empty-block">Create a reservation to unlock trip tracking.</div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === "workflow" ? (
        <WorkflowTracker
          stages={catalog.workflow}
          activeIndex={summary?.active_rentals[0] ? 3 : reservationStepIndex(summary?.reservations[0]?.reservation_status)}
          title="Workflow ownership"
        />
      ) : null}
    </MobileLayout>
  );
}
