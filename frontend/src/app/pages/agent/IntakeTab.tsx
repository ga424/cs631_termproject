import { useState } from "react";
import type * as React from "react";
import type { Reservation } from "../../lib/types";
import { SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

export const DEFAULT_CUSTOMER_FORM = {
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

export const DEFAULT_RESERVATION_FORM = {
  customer_id: "",
  location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: "",
  reservation_status: "ACTIVE",
};

export type AgentCustomerForm = typeof DEFAULT_CUSTOMER_FORM;
export type AgentReservationForm = typeof DEFAULT_RESERVATION_FORM;

export function IntakeTab({
  staff,
  customerForm,
  reservationForm,
  setCustomerForm,
  setReservationForm,
  createCustomer,
  createReservation,
}: {
  staff: StaffData;
  customerForm: AgentCustomerForm;
  reservationForm: AgentReservationForm;
  setCustomerForm: React.Dispatch<React.SetStateAction<AgentCustomerForm>>;
  setReservationForm: React.Dispatch<React.SetStateAction<AgentReservationForm>>;
  createCustomer: (event: React.FormEvent) => Promise<boolean> | boolean;
  createReservation: (event: React.FormEvent) => Promise<boolean> | boolean;
}) {
  const [openForm, setOpenForm] = useState<"customer" | "reservation" | "">("");

  return (
    <>
      <SectionCard title="Create Customer" subtitle="Start with a clean customer profile for walk-ins or phone reservations.">
        {openForm !== "customer" ? (
          <button type="button" onClick={() => setOpenForm("customer")}>Create Customer</button>
        ) : (
          <form className="stack-form" onSubmit={async (event) => { if (await createCustomer(event)) setOpenForm(""); }}>
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
            <div className="action-strip">
              <button type="submit">Save Customer</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        )}
      </SectionCard>

      <SectionCard title="Create Reservation" subtitle="Convert intake into a live reservation without leaving the mobile flow.">
        {openForm !== "reservation" ? (
          <button type="button" onClick={() => setOpenForm("reservation")}>Create Reservation</button>
        ) : (
          <form className="stack-form" onSubmit={async (event) => { if (await createReservation(event)) setOpenForm(""); }}>
            <select aria-label="Reservation customer" value={reservationForm.customer_id} onChange={(e) => setReservationForm((c) => ({ ...c, customer_id: e.target.value }))} required>
              <option value="">Customer</option>
              {staff.customers.map((item) => <option key={item.customer_id} value={item.customer_id}>{item.first_name} {item.last_name}</option>)}
            </select>
            <select aria-label="Reservation branch" value={reservationForm.location_id} onChange={(e) => setReservationForm((c) => ({ ...c, location_id: e.target.value }))} required>
              <option value="">Pickup branch</option>
              {staff.locations.map((item) => <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>)}
            </select>
            <select aria-label="Reservation vehicle class" value={reservationForm.class_id} onChange={(e) => setReservationForm((c) => ({ ...c, class_id: e.target.value }))} required>
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
            <div className="action-strip">
              <button type="submit">Create Reservation</button>
              <button type="button" className="ghost-button" onClick={() => setOpenForm("")}>Cancel</button>
            </div>
          </form>
        )}
      </SectionCard>
    </>
  );
}
