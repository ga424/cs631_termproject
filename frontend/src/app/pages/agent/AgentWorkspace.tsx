import { useMemo, useState } from "react";
import { api, formatDateTime } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip, QueueList, SectionCard, WorkflowTracker } from "../../components/ui";
import type { Reservation } from "../../lib/types";

const TABS = [
  { id: "queue", label: "Queue" },
  { id: "intake", label: "Intake" },
  { id: "pickup", label: "Pickup" },
  { id: "return", label: "Return" },
];

const STAFF_WORKFLOW = [
  { stage_id: "customer-intake", label: "Customer Intake", owner_role: "agent", description: "Capture a caller or walk-in customer and validate identity and payment details." },
  { stage_id: "reservation-active", label: "Reservation Active", owner_role: "customer", description: "Reservation is confirmed and waiting for the pickup window." },
  { stage_id: "pickup-assignment", label: "Pickup Assignment", owner_role: "agent", description: "Assign a matching VIN and convert the reservation into an active rental agreement." },
  { stage_id: "rental-live", label: "Rental In Progress", owner_role: "customer", description: "Vehicle is in use and should remain visible in queue, branch, and customer views." },
  { stage_id: "return-billing", label: "Return And Billing", owner_role: "agent", description: "Close the contract, capture mileage, and compute final billing." },
];

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
  exp_month: `${12}`,
  exp_year: `${new Date().getFullYear() + 2}`,
};

const DEFAULT_RESERVATION_FORM = {
  customer_id: "",
  location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: "",
  reservation_status: "ACTIVE",
};

const DEFAULT_RENTAL_FORM = {
  reservation_id: "",
  vin: "",
  rental_start_date_time: "",
  start_odometer_reading: "",
};

const DEFAULT_RETURN_FORM = {
  contract_no: "",
  rental_end_date_time: "",
  end_odometer_reading: "",
  actual_cost: "",
};

export function AgentWorkspace() {
  const { logout } = useAuth();
  const staff = useStaffData();
  const [activeTab, setActiveTab] = useState("queue");
  const [customerForm, setCustomerForm] = useState(DEFAULT_CUSTOMER_FORM);
  const [reservationForm, setReservationForm] = useState(DEFAULT_RESERVATION_FORM);
  const [rentalForm, setRentalForm] = useState(DEFAULT_RENTAL_FORM);
  const [returnForm, setReturnForm] = useState(DEFAULT_RETURN_FORM);
  const [statusForm, setStatusForm] = useState({ reservation_id: "", reservation_status: "CANCELED" });

  const assignableCars = useMemo(() => {
    const selectedReservation = staff.reservationById[rentalForm.reservation_id];
    if (!selectedReservation) {
      return staff.cars.filter((car) => !staff.openRentalVinSet.has(car.vin));
    }
    return staff.cars.filter((car) => {
      const model = staff.modelByName[car.model_name];
      return !staff.openRentalVinSet.has(car.vin)
        && car.location_id === selectedReservation.location_id
        && model?.class_id === selectedReservation.class_id;
    });
  }, [rentalForm.reservation_id, staff]);

  async function createCustomer(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createCustomer({
        ...customerForm,
        exp_month: Number(customerForm.exp_month),
        exp_year: Number(customerForm.exp_year),
      });
      setReservationForm((current) => ({ ...current, customer_id: created.customer_id }));
      setCustomerForm(DEFAULT_CUSTOMER_FORM);
    }, "Customer created.");
  }

  async function createReservation(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createReservation({
        ...reservationForm,
        pickup_date_time: new Date(reservationForm.pickup_date_time).toISOString(),
        return_date_time_requested: new Date(reservationForm.return_date_time_requested).toISOString(),
      } as Reservation);
      setRentalForm((current) => ({ ...current, reservation_id: created.reservation_id }));
      setReservationForm(DEFAULT_RESERVATION_FORM);
    }, "Reservation created.");
  }

  async function createRental(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createRentalAgreement({
        reservation_id: rentalForm.reservation_id,
        vin: rentalForm.vin,
        rental_start_date_time: new Date(rentalForm.rental_start_date_time).toISOString(),
        start_odometer_reading: Number(rentalForm.start_odometer_reading),
      });
      setReturnForm((current) => ({ ...current, contract_no: created.contract_no }));
      setRentalForm(DEFAULT_RENTAL_FORM);
    }, "Pickup complete and rental started.");
  }

  async function closeRental(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.closeRentalAgreement(returnForm.contract_no, {
        rental_end_date_time: new Date(returnForm.rental_end_date_time).toISOString(),
        end_odometer_reading: Number(returnForm.end_odometer_reading),
        ...(returnForm.actual_cost ? { actual_cost: Number(returnForm.actual_cost) } : {}),
      });
      setReturnForm(DEFAULT_RETURN_FORM);
    }, "Rental closed and billed.");
  }

  async function updateStatus(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.updateReservationStatus(statusForm.reservation_id, statusForm.reservation_status);
      setStatusForm({ reservation_id: "", reservation_status: "CANCELED" });
    }, `Reservation marked ${statusForm.reservation_status}.`);
  }

  return (
    <MobileLayout
      title="Agent Workspace"
      subtitle="Handle intake, walk-ins, pickups, returns, and exceptions with a task-first branch workflow."
      role="agent"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={staff.error} success={staff.success} />
      {staff.loading ? <div className="loading-strip">Syncing branch workflow data…</div> : null}

      {activeTab === "queue" ? (
        <>
          <SectionCard title="Priority queue" subtitle="Operational work that needs attention first.">
            <div className="queue-grid">
              <QueueList
                title="Upcoming pickups"
                items={(staff.dashboard?.upcoming_pickups || []).map((item) => ({
                  id: item.reservation_id,
                  title: item.location_name,
                  subtitle: formatDateTime(item.pickup_date_time),
                  meta: item.reservation_status,
                }))}
                emptyText="No pickups due soon."
              />
              <QueueList
                title="Open rentals"
                items={staff.openRentals.map((item) => ({
                  id: item.contract_no,
                  title: item.vin,
                  subtitle: `Started ${formatDateTime(item.rental_start_date_time)}`,
                  meta: item.contract_no.slice(0, 8),
                }))}
                emptyText="No open rentals."
              />
            </div>
          </SectionCard>
          <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={2} title="Branch workflow" />
        </>
      ) : null}

      {activeTab === "intake" ? (
        <>
          <SectionCard title="Create Customer" subtitle="Start with a clean customer profile for walk-ins or phone reservations.">
            <form className="stack-form" onSubmit={createCustomer}>
              <div className="field-grid two-col">
                <input placeholder="First name" value={customerForm.first_name} onChange={(e) => setCustomerForm((c) => ({ ...c, first_name: e.target.value }))} required />
                <input placeholder="Last name" value={customerForm.last_name} onChange={(e) => setCustomerForm((c) => ({ ...c, last_name: e.target.value }))} required />
                <input placeholder="Street" value={customerForm.street} onChange={(e) => setCustomerForm((c) => ({ ...c, street: e.target.value }))} required />
                <input placeholder="City" value={customerForm.city} onChange={(e) => setCustomerForm((c) => ({ ...c, city: e.target.value }))} required />
                <input placeholder="State" value={customerForm.state} onChange={(e) => setCustomerForm((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="ZIP" value={customerForm.zip} onChange={(e) => setCustomerForm((c) => ({ ...c, zip: e.target.value }))} required />
                <input placeholder="License number" value={customerForm.license_number} onChange={(e) => setCustomerForm((c) => ({ ...c, license_number: e.target.value }))} required />
                <input placeholder="License state" value={customerForm.license_state} onChange={(e) => setCustomerForm((c) => ({ ...c, license_state: e.target.value.toUpperCase().slice(0, 2) }))} required />
                <input placeholder="Card type" value={customerForm.credit_card_type} onChange={(e) => setCustomerForm((c) => ({ ...c, credit_card_type: e.target.value }))} required />
                <input placeholder="Card number" value={customerForm.credit_card_number} onChange={(e) => setCustomerForm((c) => ({ ...c, credit_card_number: e.target.value }))} required />
                <input type="number" min="1" max="12" placeholder="Exp month" value={customerForm.exp_month} onChange={(e) => setCustomerForm((c) => ({ ...c, exp_month: e.target.value }))} required />
                <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={customerForm.exp_year} onChange={(e) => setCustomerForm((c) => ({ ...c, exp_year: e.target.value }))} required />
              </div>
              <button type="submit">Save Customer</button>
            </form>
          </SectionCard>

          <SectionCard title="Create Reservation" subtitle="Convert intake into a live reservation without leaving the mobile flow.">
            <form className="stack-form" onSubmit={createReservation}>
              <select value={reservationForm.customer_id} onChange={(e) => setReservationForm((c) => ({ ...c, customer_id: e.target.value }))} required>
                <option value="">Customer</option>
                {staff.customers.map((item) => <option key={item.customer_id} value={item.customer_id}>{item.first_name} {item.last_name}</option>)}
              </select>
              <select value={reservationForm.location_id} onChange={(e) => setReservationForm((c) => ({ ...c, location_id: e.target.value }))} required>
                <option value="">Pickup branch</option>
                {staff.locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>)}
              </select>
              <select value={reservationForm.class_id} onChange={(e) => setReservationForm((c) => ({ ...c, class_id: e.target.value }))} required>
                <option value="">Vehicle class</option>
                {staff.carClasses.map((item) => <option key={item.class_id} value={item.class_id}>{item.class_name}</option>)}
              </select>
              <label className="stack-label">
                Pickup
                <input type="datetime-local" value={reservationForm.pickup_date_time} onChange={(e) => setReservationForm((c) => ({ ...c, pickup_date_time: e.target.value }))} required />
              </label>
              <label className="stack-label">
                Return
                <input type="datetime-local" value={reservationForm.return_date_time_requested} onChange={(e) => setReservationForm((c) => ({ ...c, return_date_time_requested: e.target.value }))} required />
              </label>
              <button type="submit">Create Reservation</button>
            </form>
          </SectionCard>
        </>
      ) : null}

      {activeTab === "pickup" ? (
        <SectionCard title="Pickup Assignment" subtitle="Assign a compatible VIN and start the rental contract.">
          <form className="stack-form" onSubmit={createRental}>
            <select value={rentalForm.reservation_id} onChange={(e) => setRentalForm((c) => ({ ...c, reservation_id: e.target.value }))} required>
              <option value="">Reservation</option>
              {staff.activeReservations.map((item) => (
                <option key={item.reservation_id} value={item.reservation_id}>
                  {staff.customerById[item.customer_id]?.first_name || "Customer"} · {item.reservation_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select value={rentalForm.vin} onChange={(e) => setRentalForm((c) => ({ ...c, vin: e.target.value }))} required>
              <option value="">Assignable vehicle</option>
              {assignableCars.map((car) => (
                <option key={car.vin} value={car.vin}>{car.vin} · {car.model_name}</option>
              ))}
            </select>
            <label className="stack-label">
              Rental start
              <input type="datetime-local" value={rentalForm.rental_start_date_time} onChange={(e) => setRentalForm((c) => ({ ...c, rental_start_date_time: e.target.value }))} required />
            </label>
            <input type="number" min="0" placeholder="Start odometer" value={rentalForm.start_odometer_reading} onChange={(e) => setRentalForm((c) => ({ ...c, start_odometer_reading: e.target.value }))} required />
            <button type="submit">Start Rental</button>
          </form>
        </SectionCard>
      ) : null}

      {activeTab === "return" ? (
        <>
          <SectionCard title="Return And Billing" subtitle="Close a contract and finalize billing from one flow.">
            <form className="stack-form" onSubmit={closeRental}>
              <select value={returnForm.contract_no} onChange={(e) => setReturnForm((c) => ({ ...c, contract_no: e.target.value }))} required>
                <option value="">Open contract</option>
                {staff.openRentals.map((item) => <option key={item.contract_no} value={item.contract_no}>{item.vin} · {item.contract_no.slice(0, 8)}</option>)}
              </select>
              <label className="stack-label">
                Rental end
                <input type="datetime-local" value={returnForm.rental_end_date_time} onChange={(e) => setReturnForm((c) => ({ ...c, rental_end_date_time: e.target.value }))} required />
              </label>
              <input type="number" min="0" placeholder="End odometer" value={returnForm.end_odometer_reading} onChange={(e) => setReturnForm((c) => ({ ...c, end_odometer_reading: e.target.value }))} required />
              <input type="number" min="0" step="0.01" placeholder="Actual cost override (optional)" value={returnForm.actual_cost} onChange={(e) => setReturnForm((c) => ({ ...c, actual_cost: e.target.value }))} />
              <button type="submit">Close And Bill</button>
            </form>
          </SectionCard>

          <SectionCard title="Cancellation / No Show" subtitle="Resolve reservation exceptions directly from the branch queue.">
            <form className="stack-form" onSubmit={updateStatus}>
              <select value={statusForm.reservation_id} onChange={(e) => setStatusForm((c) => ({ ...c, reservation_id: e.target.value }))} required>
                <option value="">Reservation</option>
                {staff.activeReservations.map((item) => (
                  <option key={item.reservation_id} value={item.reservation_id}>
                    {staff.customerById[item.customer_id]?.first_name || "Customer"} · {item.reservation_id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <select value={statusForm.reservation_status} onChange={(e) => setStatusForm((c) => ({ ...c, reservation_status: e.target.value }))}>
                <option value="CANCELED">Canceled</option>
                <option value="NO_SHOW">No show</option>
              </select>
              <button type="submit">Update Reservation</button>
            </form>
          </SectionCard>
        </>
      ) : null}
    </MobileLayout>
  );
}
