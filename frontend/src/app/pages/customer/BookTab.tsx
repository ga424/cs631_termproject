import { formatCurrency } from "../../lib/api";
import type { CustomerPortalCatalog } from "../../lib/types";

export const CUSTOMER_BOOKING_DEFAULT_FORM = {
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

export type CustomerBookingForm = typeof CUSTOMER_BOOKING_DEFAULT_FORM;

export function BookTab({
  catalog,
  form,
  onChange,
  onSubmit,
}: {
  catalog: CustomerPortalCatalog;
  form: CustomerBookingForm;
  onChange: (form: CustomerBookingForm) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form className="stack-form reservation-journey" onSubmit={onSubmit}>
      <ol className="journey-steps">
        <li>
          <div className="section-kicker">1</div>
          <div>
            <strong>Confirm profile</strong>
            <span>Identity and contact details stay linked to your customer account.</span>
          </div>
        </li>
        <li>
          <div className="section-kicker">2</div>
          <div>
            <strong>Select trip</strong>
            <span>Choose branch, vehicle class, pickup, and return window.</span>
          </div>
        </li>
        <li>
          <div className="section-kicker">3</div>
          <div>
            <strong>Reserve</strong>
            <span>The reservation appears immediately in My Trip with its own journey status.</span>
          </div>
        </li>
      </ol>
      <fieldset className="form-fieldset">
        <legend>Profile</legend>
        <div className="field-grid two-col">
          <input placeholder="First name" value={form.first_name} onChange={(e) => onChange({ ...form, first_name: e.target.value })} required />
          <input placeholder="Last name" value={form.last_name} onChange={(e) => onChange({ ...form, last_name: e.target.value })} required />
          <input placeholder="Street" value={form.street} onChange={(e) => onChange({ ...form, street: e.target.value })} required />
          <input placeholder="City" value={form.city} onChange={(e) => onChange({ ...form, city: e.target.value })} required />
          <input placeholder="State" value={form.state} onChange={(e) => onChange({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} required />
          <input placeholder="ZIP" value={form.zip} onChange={(e) => onChange({ ...form, zip: e.target.value })} required />
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Driver And Payment</legend>
        <div className="field-grid two-col">
          <input placeholder="License number" value={form.license_number} onChange={(e) => onChange({ ...form, license_number: e.target.value })} required />
          <input placeholder="License state" value={form.license_state} onChange={(e) => onChange({ ...form, license_state: e.target.value.toUpperCase().slice(0, 2) })} required />
          <input placeholder="Card type" value={form.credit_card_type} onChange={(e) => onChange({ ...form, credit_card_type: e.target.value })} required />
          <input placeholder="Card number" value={form.credit_card_number} onChange={(e) => onChange({ ...form, credit_card_number: e.target.value })} required />
          <input type="number" min="1" max="12" placeholder="Exp month" value={form.exp_month} onChange={(e) => onChange({ ...form, exp_month: e.target.value })} required />
          <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={form.exp_year} onChange={(e) => onChange({ ...form, exp_year: e.target.value })} required />
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Reservation</legend>
        <div className="field-grid">
          <select value={form.location_id} onChange={(e) => onChange({ ...form, location_id: e.target.value })} required>
            <option value="">Pickup branch</option>
            {catalog.locations.map((item) => (
              <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>
            ))}
          </select>
          <select value={form.class_id} onChange={(e) => onChange({ ...form, class_id: e.target.value })} required>
            <option value="">Vehicle class</option>
            {catalog.car_classes.map((item) => (
              <option key={item.class_id} value={item.class_id}>{item.class_name} · {formatCurrency(item.daily_rate)}/day</option>
            ))}
          </select>
          <label className="stack-label">
            Pickup
            <input type="datetime-local" value={form.pickup_date_time} onChange={(e) => onChange({ ...form, pickup_date_time: e.target.value })} required />
          </label>
          <label className="stack-label">
            Return
            <input type="datetime-local" value={form.return_date_time_requested} onChange={(e) => onChange({ ...form, return_date_time_requested: e.target.value })} required />
          </label>
        </div>
      </fieldset>
      <button type="submit">Reserve My Car</button>
    </form>
  );
}
