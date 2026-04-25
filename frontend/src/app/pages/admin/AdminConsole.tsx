import { useState } from "react";
import { formatCurrency } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip, QueueList, SectionCard, StatGrid, WorkflowTracker } from "../../components/ui";
import { api } from "../../lib/api";

const TABS = [
  { id: "operations", label: "Ops" },
  { id: "inventory", label: "Fleet" },
  { id: "pricing", label: "Pricing" },
  { id: "workflow", label: "Workflow" },
];

const STAFF_WORKFLOW = [
  { stage_id: "customer-intake", label: "Customer Intake", owner_role: "agent", description: "Capture a caller or walk-in customer and validate identity and payment details." },
  { stage_id: "reservation-active", label: "Reservation Active", owner_role: "customer", description: "Reservation is confirmed and waiting for the pickup window." },
  { stage_id: "pickup-assignment", label: "Pickup Assignment", owner_role: "agent", description: "Assign a matching VIN and convert the reservation into an active rental agreement." },
  { stage_id: "rental-live", label: "Rental In Progress", owner_role: "customer", description: "Vehicle is in use and should remain visible in queue, branch, and customer views." },
  { stage_id: "return-billing", label: "Return And Billing", owner_role: "agent", description: "Close the contract, capture mileage, and compute final billing." },
  { stage_id: "fleet-admin", label: "Fleet And Pricing Maintenance", owner_role: "admin", description: "Keep inventory, location, and rate setup aligned with branch operations." },
];

export function AdminConsole() {
  const { logout } = useAuth();
  const staff = useStaffData();
  const [activeTab, setActiveTab] = useState("operations");
  const [locationForm, setLocationForm] = useState({ street: "", city: "", state: "", zip: "" });
  const [classForm, setClassForm] = useState({ class_name: "", daily_rate: "", weekly_rate: "" });
  const [modelForm, setModelForm] = useState({ model_name: "", make_name: "", model_year: "", class_id: "" });
  const [carForm, setCarForm] = useState({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });

  async function createLocation(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.createLocation(locationForm);
      setLocationForm({ street: "", city: "", state: "", zip: "" });
    }, "Location created.");
  }

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.createCarClass({
        class_name: classForm.class_name,
        daily_rate: Number(classForm.daily_rate),
        weekly_rate: Number(classForm.weekly_rate),
      });
      setClassForm({ class_name: "", daily_rate: "", weekly_rate: "" });
    }, "Car class created.");
  }

  async function createModel(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.createModel({
        model_name: modelForm.model_name,
        make_name: modelForm.make_name,
        model_year: Number(modelForm.model_year),
        class_id: modelForm.class_id,
      });
      setModelForm({ model_name: "", make_name: "", model_year: "", class_id: "" });
    }, "Model created.");
  }

  async function createCar(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.createCar({
        vin: carForm.vin,
        current_odometer_reading: Number(carForm.current_odometer_reading),
        location_id: carForm.location_id,
        model_name: carForm.model_name,
      });
      setCarForm({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });
    }, "Car added to fleet.");
  }

  async function deleteLocation(locationId: string, city: string) {
    if (!window.confirm(`Delete ${city} location?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteLocation(locationId);
    }, `${city} location deleted.`);
  }

  return (
    <MobileLayout
      title="Rental Admin Console"
      subtitle="Maintain branch setup, fleet records, pricing, and BPMN-aligned operating controls."
      role="admin"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={staff.error} success={staff.success} />
      {staff.loading ? <div className="loading-strip">Syncing admin controls…</div> : null}

      {activeTab === "operations" ? (
        <>
          <StatGrid stats={staff.stats} />
          <SectionCard title="Operational Health" subtitle="Admin oversight of live branch activity and configuration-sensitive workflows.">
            <QueueList title="Priority admin watchlist" items={staff.managerAlerts.slice(0, 6)} emptyText="No elevated branch issues." />
          </SectionCard>
        </>
      ) : null}

      {activeTab === "inventory" ? (
        <>
          <SectionCard title="Locations And Fleet" subtitle="Manage branch setup and physical inventory from stacked mobile cards.">
            <form className="stack-form" onSubmit={createLocation}>
              <div className="field-grid two-col">
                <input placeholder="Street" value={locationForm.street} onChange={(e) => setLocationForm((c) => ({ ...c, street: e.target.value }))} required />
                <input placeholder="City" value={locationForm.city} onChange={(e) => setLocationForm((c) => ({ ...c, city: e.target.value }))} required />
                <input placeholder="State" value={locationForm.state} onChange={(e) => setLocationForm((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="ZIP" value={locationForm.zip} onChange={(e) => setLocationForm((c) => ({ ...c, zip: e.target.value }))} required />
              </div>
              <button type="submit">Add Location</button>
            </form>
            <form className="stack-form" onSubmit={createCar}>
              <input placeholder="VIN" minLength={17} maxLength={17} value={carForm.vin} onChange={(e) => setCarForm((c) => ({ ...c, vin: e.target.value }))} required />
              <input type="number" min="0" placeholder="Current odometer" value={carForm.current_odometer_reading} onChange={(e) => setCarForm((c) => ({ ...c, current_odometer_reading: e.target.value }))} required />
              <select value={carForm.location_id} onChange={(e) => setCarForm((c) => ({ ...c, location_id: e.target.value }))} required>
                <option value="">Location</option>
                {staff.locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>)}
              </select>
              <select value={carForm.model_name} onChange={(e) => setCarForm((c) => ({ ...c, model_name: e.target.value }))} required>
                <option value="">Model</option>
                {staff.models.map((item) => <option key={item.model_name} value={item.model_name}>{item.make_name} {item.model_name}</option>)}
              </select>
              <button type="submit">Register Car</button>
            </form>
          </SectionCard>
          <SectionCard title="Current inventory" subtitle="Delete only records that are safe to remove.">
            <QueueList
              title="Locations"
              items={staff.locations.map((item) => ({
                id: item.location_id,
                title: `${item.city}, ${item.state}`,
                subtitle: item.street,
                meta: "Tap delete to remove",
              }))}
              emptyText="No locations configured."
            />
            <div className="action-strip">
              {staff.locations.slice(0, 4).map((item) => (
                <button key={item.location_id} type="button" className="danger-mini" onClick={() => void deleteLocation(item.location_id, item.city)}>
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
            <form className="stack-form" onSubmit={createClass}>
              <input placeholder="Class name" value={classForm.class_name} onChange={(e) => setClassForm((c) => ({ ...c, class_name: e.target.value }))} required />
              <input type="number" min="1" step="0.01" placeholder="Daily rate" value={classForm.daily_rate} onChange={(e) => setClassForm((c) => ({ ...c, daily_rate: e.target.value }))} required />
              <input type="number" min="1" step="0.01" placeholder="Weekly rate" value={classForm.weekly_rate} onChange={(e) => setClassForm((c) => ({ ...c, weekly_rate: e.target.value }))} required />
              <button type="submit">Add Class</button>
            </form>
            <form className="stack-form" onSubmit={createModel}>
              <input placeholder="Model name" value={modelForm.model_name} onChange={(e) => setModelForm((c) => ({ ...c, model_name: e.target.value }))} required />
              <input placeholder="Make" value={modelForm.make_name} onChange={(e) => setModelForm((c) => ({ ...c, make_name: e.target.value }))} required />
              <input type="number" min="1980" placeholder="Model year" value={modelForm.model_year} onChange={(e) => setModelForm((c) => ({ ...c, model_year: e.target.value }))} required />
              <select value={modelForm.class_id} onChange={(e) => setModelForm((c) => ({ ...c, class_id: e.target.value }))} required>
                <option value="">Class</option>
                {staff.carClasses.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
              </select>
              <button type="submit">Add Model</button>
            </form>
          </SectionCard>
          <SectionCard title="Current pricing" subtitle="Quick reference for rate governance and BPMN support tasks.">
            <QueueList
              title="Classes"
              items={staff.carClasses.map((item) => ({
                id: item.class_id,
                title: item.class_name,
                subtitle: `${formatCurrency(item.daily_rate)} day / ${formatCurrency(item.weekly_rate)} week`,
                meta: "Pricing",
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
    </MobileLayout>
  );
}
