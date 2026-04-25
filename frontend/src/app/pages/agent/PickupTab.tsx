import { SectionCard } from "../../components/ui";
import type { Car } from "../../lib/types";
import type { StaffData } from "../../hooks/useStaffData";

export const DEFAULT_RENTAL_FORM = {
  reservation_id: "",
  vin: "",
  rental_start_date_time: "",
  start_odometer_reading: "",
};

export type AgentRentalForm = typeof DEFAULT_RENTAL_FORM;

export function PickupTab({
  staff,
  rentalForm,
  setRentalForm,
  assignableCars,
  createRental,
}: {
  staff: StaffData;
  rentalForm: AgentRentalForm;
  setRentalForm: React.Dispatch<React.SetStateAction<AgentRentalForm>>;
  assignableCars: Car[];
  createRental: (event: React.FormEvent) => void;
}) {
  return (
    <SectionCard title="Pickup Assignment" subtitle="Assign a compatible VIN and start the rental contract.">
      <form className="stack-form" onSubmit={createRental}>
        <select value={rentalForm.reservation_id} onChange={(e) => setRentalForm((c) => ({ ...c, reservation_id: e.target.value }))} required>
          <option value="">Reservation</option>
          {staff.unassignedActiveReservations.map((item) => (
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
        {rentalForm.reservation_id && assignableCars.length === 0 ? (
          <div className="empty-block">No available car matches this reservation branch and class.</div>
        ) : null}
        <label className="stack-label">
          Rental start
          <input type="datetime-local" value={rentalForm.rental_start_date_time} onChange={(e) => setRentalForm((c) => ({ ...c, rental_start_date_time: e.target.value }))} required />
        </label>
        <input type="number" min="0" placeholder="Start odometer" value={rentalForm.start_odometer_reading} onChange={(e) => setRentalForm((c) => ({ ...c, start_odometer_reading: e.target.value }))} required />
        <button type="submit">Start Rental</button>
      </form>
    </SectionCard>
  );
}
