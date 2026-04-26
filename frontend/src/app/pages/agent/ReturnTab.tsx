import { SectionCard } from "../../components/ui";
import type * as React from "react";
import type { StaffData } from "../../hooks/useStaffData";

export const DEFAULT_RETURN_FORM = {
  contract_no: "",
  rental_end_date_time: "",
  end_odometer_reading: "",
  actual_cost: "",
};

export type AgentReturnForm = typeof DEFAULT_RETURN_FORM;
export type StatusForm = { reservation_id: string; reservation_status: string };

export function ReturnTab({
  staff,
  returnForm,
  statusForm,
  setReturnForm,
  setStatusForm,
  closeRental,
  updateStatus,
}: {
  staff: StaffData;
  returnForm: AgentReturnForm;
  statusForm: StatusForm;
  setReturnForm: React.Dispatch<React.SetStateAction<AgentReturnForm>>;
  setStatusForm: React.Dispatch<React.SetStateAction<StatusForm>>;
  closeRental: (event: React.SyntheticEvent) => void;
  updateStatus: (event: React.FormEvent) => void;
}) {
  const selectedRental = staff.openRentals.find((item) => item.contract_no === returnForm.contract_no);
  const canCloseRental = Boolean(returnForm.contract_no && returnForm.rental_end_date_time && returnForm.end_odometer_reading);

  return (
    <>
      <SectionCard title="Return And Billing" subtitle="Close a contract and finalize billing from one flow.">
        <form className="stack-form" onSubmit={closeRental}>
          <select aria-label="Open contract" value={returnForm.contract_no} onChange={(e) => setReturnForm((c) => ({ ...c, contract_no: e.target.value }))} required>
            <option value="">Open contract</option>
            {staff.openRentals.map((item) => <option key={item.contract_no} value={item.contract_no}>{item.vin} · {item.contract_no.slice(0, 8)}</option>)}
          </select>
          {selectedRental ? (
            <div className="identity-card">
              <strong>Pickup odometer</strong>
              <span>{selectedRental.start_odometer_reading.toLocaleString()} miles</span>
              <p>Enter only the new odometer reading captured when the vehicle is returned.</p>
            </div>
          ) : null}
          <label className="stack-label">
            Rental end
            <input type="datetime-local" value={returnForm.rental_end_date_time} onChange={(e) => setReturnForm((c) => ({ ...c, rental_end_date_time: e.target.value }))} required />
          </label>
          <input type="number" min={selectedRental?.start_odometer_reading || 0} placeholder="Return odometer" value={returnForm.end_odometer_reading} onChange={(e) => setReturnForm((c) => ({ ...c, end_odometer_reading: e.target.value }))} required />
          <input type="number" min="0" step="0.01" placeholder="Actual cost override (optional)" value={returnForm.actual_cost} onChange={(e) => setReturnForm((c) => ({ ...c, actual_cost: e.target.value }))} />
          <button type="button" disabled={!canCloseRental} onClick={closeRental}>Close And Bill</button>
        </form>
      </SectionCard>

      <SectionCard title="Cancellation / No Show" subtitle="Resolve reservation exceptions directly from the branch queue.">
        <form className="stack-form" onSubmit={updateStatus}>
          <select aria-label="Exception reservation" value={statusForm.reservation_id} onChange={(e) => setStatusForm((c) => ({ ...c, reservation_id: e.target.value }))} required>
            <option value="">Reservation</option>
            {staff.unassignedActiveReservations.map((item) => (
              <option key={item.reservation_id} value={item.reservation_id}>
                {staff.customerById[item.customer_id]?.first_name || "Customer"} · {item.reservation_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <select aria-label="Exception status" value={statusForm.reservation_status} onChange={(e) => setStatusForm((c) => ({ ...c, reservation_status: e.target.value }))}>
            <option value="CANCELED">Canceled</option>
            <option value="NO_SHOW">No show</option>
          </select>
          <button type="submit">Update Reservation</button>
        </form>
      </SectionCard>
    </>
  );
}
