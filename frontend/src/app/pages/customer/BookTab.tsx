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
  return_location_id: "",
  return_to_different_location: false,
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
            <span>Choose pickup branch, pickup time, return branch, return time, and vehicle class.</span>
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
        <legend>Trip Details</legend>
        <div className="field-grid">
          <select value={form.location_id} onChange={(e) => onChange({ ...form, location_id: e.target.value })} required>
            <option value="">Pick-up location</option>
            {catalog.locations.map((item) => (
              <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>
            ))}
          </select>
          <label className="stack-label checkbox-line">
            <input
              type="checkbox"
              checked={form.return_to_different_location}
              onChange={(e) => onChange({
                ...form,
                return_to_different_location: e.target.checked,
                return_location_id: e.target.checked ? form.return_location_id : "",
              })}
            />
            Return to a different location
          </label>
          {form.return_to_different_location ? (
            <select value={form.return_location_id} onChange={(e) => onChange({ ...form, return_location_id: e.target.value })} required>
              <option value="">Drop-off location</option>
              {catalog.locations.map((item) => (
                <option key={item.location_id} value={item.location_id}>{item.city}, {item.state}</option>
              ))}
            </select>
          ) : null}
          <label className="stack-label">
            Pickup
            <input type="datetime-local" value={form.pickup_date_time} onChange={(e) => onChange({ ...form, pickup_date_time: e.target.value })} required />
          </label>
          <label className="stack-label">
            Drop-off
            <input type="datetime-local" value={form.return_date_time_requested} onChange={(e) => onChange({ ...form, return_date_time_requested: e.target.value })} required />
          </label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Choose Vehicle Class</legend>
        <div className="vehicle-option-grid">
          {(catalog.vehicle_options.length ? catalog.vehicle_options : catalog.car_classes.map((item) => ({
            class_id: item.class_id,
            class_name: item.class_name,
            similar_model: `${item.class_name} or Similar`,
            seats: 5,
            doors: 4,
            bags: 1,
            daily_rate: item.daily_rate,
            weekly_rate: item.weekly_rate,
            rate_badge: "Standard Rate",
            upgrade_badge: null,
            available_count: 1,
            is_available: true,
          }))).map((option) => (
            <label key={option.class_id} className={`vehicle-option-card ${form.class_id === option.class_id ? "selected" : ""} ${option.is_available ? "" : "unavailable"}`}>
              <input
                type="radio"
                name="class_id"
                value={option.class_id}
                checked={form.class_id === option.class_id}
                onChange={(e) => onChange({ ...form, class_id: e.target.value })}
                disabled={!option.is_available}
                required
              />
              <span className="vehicle-card-main">
                <strong>{option.class_name}</strong>
                <small>{option.similar_model}</small>
                <em>{option.seats} seats · {option.doors} doors · {option.bags} bags</em>
              </span>
              <span className="vehicle-card-rate">
                <small>{option.is_available ? option.upgrade_badge || "Coupon does not apply" : "Out of stock"}</small>
                <strong>{option.is_available ? `${formatCurrency(option.daily_rate)}/day` : "Unavailable"}</strong>
                <em>{option.is_available ? `${option.rate_badge} · ${option.available_count} available` : option.class_name}</em>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button type="submit">Reserve My Car</button>
    </form>
  );
}
