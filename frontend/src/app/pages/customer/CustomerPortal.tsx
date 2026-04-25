import { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCustomerPortal } from "../../hooks/useCustomerPortal";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip } from "../../components/ui";
import { BookTab, CUSTOMER_BOOKING_DEFAULT_FORM } from "./BookTab";
import { MyTripTab } from "./MyTripTab";
import { WorkflowTab } from "./WorkflowTab";

const TABS = [
  { id: "book", label: "Book" },
  { id: "trip", label: "My Trip" },
  { id: "workflow", label: "Workflow" },
];

export function CustomerPortal() {
  const { logout } = useAuth();
  const { catalog, summary, loading, error, success, setError, createBooking, refresh } = useCustomerPortal();
  const [activeTab, setActiveTab] = useState("book");
  const [form, setForm] = useState(CUSTOMER_BOOKING_DEFAULT_FORM);

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
      setForm(CUSTOMER_BOOKING_DEFAULT_FORM);
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
      {activeTab === "book" ? <BookTab catalog={catalog} form={form} onChange={setForm} onSubmit={submit} /> : null}
      {activeTab === "trip" ? <MyTripTab summary={summary} locationById={locationById} classById={classById} onRefresh={() => void refresh()} /> : null}
      {activeTab === "workflow" ? <WorkflowTab catalog={catalog} summary={summary} /> : null}
    </MobileLayout>
  );
}
