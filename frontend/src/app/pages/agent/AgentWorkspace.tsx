import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip } from "../../components/ui";
import type { Reservation } from "../../lib/types";
import { DEFAULT_CUSTOMER_FORM, DEFAULT_RESERVATION_FORM, IntakeTab } from "./IntakeTab";
import { DEFAULT_RENTAL_FORM, PickupTab } from "./PickupTab";
import { DEFAULT_RETURN_FORM, ReturnTab } from "./ReturnTab";
import { QueueTab } from "./QueueTab";

const TABS = [
  { id: "queue", label: "Queue" },
  { id: "intake", label: "Intake" },
  { id: "pickup", label: "Pickup" },
  { id: "return", label: "Return" },
];

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
      {activeTab === "queue" ? <QueueTab staff={staff} /> : null}
      {activeTab === "intake" ? (
        <IntakeTab
          staff={staff}
          customerForm={customerForm}
          reservationForm={reservationForm}
          setCustomerForm={setCustomerForm}
          setReservationForm={setReservationForm}
          createCustomer={createCustomer}
          createReservation={createReservation}
        />
      ) : null}
      {activeTab === "pickup" ? <PickupTab staff={staff} rentalForm={rentalForm} setRentalForm={setRentalForm} assignableCars={assignableCars} createRental={createRental} /> : null}
      {activeTab === "return" ? (
        <ReturnTab
          staff={staff}
          returnForm={returnForm}
          statusForm={statusForm}
          setReturnForm={setReturnForm}
          setStatusForm={setStatusForm}
          closeRental={closeRental}
          updateStatus={updateStatus}
        />
      ) : null}
    </MobileLayout>
  );
}
