import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerPortal } from "../../hooks/useCustomerPortal";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip } from "../../components/ui";
import { BookTab, CUSTOMER_BOOKING_DEFAULT_FORM } from "./BookTab";
import { MyTripTab } from "./MyTripTab";
import { WorkflowTab } from "./WorkflowTab";

const TABS = [
  { id: "trip", label: "My Trip" },
  { id: "workflow", label: "Workflow" },
];

export function CustomerPortal() {
  const { logout } = useAuth();
  const { catalog, summary, loading, error, success, setError, createBooking, refresh } = useCustomerPortal();
  const [activeTab, setActiveTab] = useState("trip");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [autoOpenedEmptyTrip, setAutoOpenedEmptyTrip] = useState(false);
  const [form, setForm] = useState(CUSTOMER_BOOKING_DEFAULT_FORM);

  const locationById = useMemo(() => Object.fromEntries(catalog.locations.map((item) => [item.location_id, item])), [catalog.locations]);
  const classById = useMemo(() => Object.fromEntries(catalog.car_classes.map((item) => [item.class_id, item])), [catalog.car_classes]);

  useEffect(() => {
    if (!summary?.customer) {
      return;
    }
    const customer = summary.customer;
    setForm((current) => ({
      ...current,
      first_name: customer.first_name,
      last_name: customer.last_name,
      street: customer.street,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      license_number: customer.license_number,
      license_state: customer.license_state,
      credit_card_type: customer.credit_card_type,
      credit_card_number: customer.credit_card_number,
      exp_month: String(customer.exp_month),
      exp_year: String(customer.exp_year),
    }));
  }, [summary?.customer]);

  useEffect(() => {
    if (!loading && summary && summary.reservations.length === 0 && summary.active_rentals.length === 0 && !autoOpenedEmptyTrip) {
      setBookingOpen(true);
      setAutoOpenedEmptyTrip(true);
    }
  }, [autoOpenedEmptyTrip, loading, summary]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createBooking({
        ...form,
        exp_month: Number(form.exp_month),
        exp_year: Number(form.exp_year),
        return_location_id: form.return_to_different_location ? form.return_location_id : form.location_id,
        pickup_date_time: new Date(form.pickup_date_time).toISOString(),
        return_date_time_requested: new Date(form.return_date_time_requested).toISOString(),
      });
      setForm((current) => ({
        ...current,
        location_id: "",
        return_location_id: "",
        return_to_different_location: false,
        class_id: "",
        pickup_date_time: "",
        return_date_time_requested: "",
      }));
      setActiveTab("trip");
      setBookingOpen(false);
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
      {activeTab === "trip" ? (
        <MyTripTab
          summary={summary}
          locationById={locationById}
          classById={classById}
          onRefresh={() => void refresh()}
          onReserve={() => setBookingOpen(true)}
        />
      ) : null}
      {activeTab === "workflow" ? <WorkflowTab catalog={catalog} summary={summary} /> : null}
      {bookingOpen ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true" aria-label="Reserve a car">
          <aside className="booking-drawer">
            <div className="surface-head">
              <div>
                <p className="eyebrow">Reserve A Car</p>
                <h2>Reservation Journey</h2>
                <p>Confirm your profile, choose the trip details, then track this reservation from My Trip.</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setBookingOpen(false)}>Close</button>
            </div>
            <BookTab catalog={catalog} form={form} onChange={setForm} onSubmit={submit} />
          </aside>
        </div>
      ) : null}
    </MobileLayout>
  );
}
