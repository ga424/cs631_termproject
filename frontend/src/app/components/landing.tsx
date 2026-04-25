import type { CustomerDemoAccount, Role } from "../lib/types";
import { AlertStrip } from "./ui";

export const ROLE_COPY: Record<Role, { title: string; surface: string; subtitle: string; icon: string; tone: string }> = {
  customer: {
    title: "Customer",
    surface: "Customer Portal",
    subtitle: "Book and manage your rentals",
    icon: "◇",
    tone: "teal",
  },
  agent: {
    title: "Agent",
    surface: "Agent Workspace",
    subtitle: "Customer service and operations",
    icon: "▣",
    tone: "blue",
  },
  manager: {
    title: "Manager",
    surface: "Manager Dashboard",
    subtitle: "Branch oversight and monitoring",
    icon: "△",
    tone: "purple",
  },
  admin: {
    title: "Admin",
    surface: "Rental Admin Console",
    subtitle: "System configuration and governance",
    icon: "*",
    tone: "orange",
  },
};

export type LoginFormState = {
  username: string;
  password: string;
};

export type CustomerSignupFormState = {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  license_number: string;
  license_state: string;
  credit_card_type: string;
  credit_card_number: string;
  exp_month: string;
  exp_year: string;
};

export function MilanBrandHeader() {
  return (
    <div className="milan-brand">
      <div className="milan-logo" aria-hidden="true">
        <div className="milan-flag flag-one" />
        <div className="milan-flag flag-two" />
        <div className="milan-flag flag-three" />
        <svg className="milan-logo-mark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </div>
      <h1>Milan Rent-A-Car</h1>
      <p>Uniting innovation from Dominican Republic, India & Turkey</p>
      <span>Select your role to continue</span>
    </div>
  );
}

export function PersonaSelector({
  selectedRole,
  onSelect,
}: {
  selectedRole: string;
  onSelect: (role: Role) => void;
}) {
  const staffRoles = new Set(["agent", "manager", "admin"]);
  return (
    <div className="persona-cards login-personas" aria-label="Persona selector">
      {(Object.entries(ROLE_COPY) as Array<[Role, (typeof ROLE_COPY)[Role]]>).map(([role, copy]) => {
        const active = selectedRole === role || (role === "customer" && !staffRoles.has(selectedRole));
        return (
          <button
            key={role}
            type="button"
            aria-label={copy.surface}
            className={active ? `persona-card login-persona ${copy.tone} active` : `persona-card login-persona ${copy.tone}`}
            onClick={() => onSelect(role)}
          >
            <span className="persona-icon">{copy.icon}</span>
            <strong>{copy.title}</strong>
            <small>{copy.subtitle}</small>
          </button>
        );
      })}
    </div>
  );
}

export function SignInPanel({
  form,
  customers,
  demoLoading,
  loading,
  error,
  success,
  onChange,
  onCustomerSelect,
  onSubmit,
}: {
  form: LoginFormState;
  customers: CustomerDemoAccount[];
  demoLoading: boolean;
  loading: boolean;
  error: string;
  success: string;
  onChange: (form: LoginFormState) => void;
  onCustomerSelect: (username: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form id="sign-in-panel" onSubmit={onSubmit} className="login-form milan-login-card">
      <AlertStrip error={error} success={success} />
      <label>
        Seeded customer
        <select
          aria-label="Seeded customer"
          value={customers.some((customer) => customer.username === form.username) ? form.username : ""}
          onChange={(event) => onCustomerSelect(event.target.value)}
          disabled={demoLoading}
        >
          <option value="">{demoLoading ? "Loading customers..." : "Select customer account"}</option>
          {customers.map((customer) => (
            <option key={customer.customer_id} value={customer.username} disabled={!customer.is_active}>
              {customer.display_name} · {customer.username} · {customer.is_active ? customer.trip_status : "inactive"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Username
        <input
          aria-label="Username"
          placeholder="customer"
          value={form.username}
          onChange={(event) => onChange({ ...form, username: event.target.value })}
          required
        />
      </label>
      <label>
        Password
        <input
          aria-label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(event) => onChange({ ...form, password: event.target.value })}
          required
        />
      </label>
      <button type="submit" disabled={loading || !form.username || !form.password}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export function SignupPanel({
  form,
  loading,
  onChange,
  onSubmit,
}: {
  form: CustomerSignupFormState;
  loading: boolean;
  onChange: (form: CustomerSignupFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form className="customer-signup-panel" onSubmit={onSubmit}>
      <div className="demo-panel-head">
        <p className="eyebrow">New Customer</p>
        <h2>Create a customer account</h2>
      </div>
      <fieldset className="form-fieldset">
        <legend>Account</legend>
        <div className="field-grid two-col">
          <label>Username<input placeholder="Username" value={form.username} onChange={(e) => onChange({ ...form, username: e.target.value })} required minLength={3} /></label>
          <label>Password<input placeholder="Password" type="password" value={form.password} onChange={(e) => onChange({ ...form, password: e.target.value })} required minLength={8} /></label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Identity</legend>
        <div className="field-grid two-col">
          <label>First name<input placeholder="First name" value={form.first_name} onChange={(e) => onChange({ ...form, first_name: e.target.value })} required /></label>
          <label>Last name<input placeholder="Last name" value={form.last_name} onChange={(e) => onChange({ ...form, last_name: e.target.value })} required /></label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Address</legend>
        <div className="field-grid two-col">
          <label>Street<input placeholder="Street" value={form.street} onChange={(e) => onChange({ ...form, street: e.target.value })} required /></label>
          <label>City<input placeholder="City" value={form.city} onChange={(e) => onChange({ ...form, city: e.target.value })} required /></label>
          <label>State<input placeholder="State" value={form.state} onChange={(e) => onChange({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} required /></label>
          <label>ZIP<input placeholder="ZIP" value={form.zip} onChange={(e) => onChange({ ...form, zip: e.target.value })} required /></label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Driver License</legend>
        <div className="field-grid two-col">
          <label>License number<input placeholder="License number" value={form.license_number} onChange={(e) => onChange({ ...form, license_number: e.target.value })} required /></label>
          <label>License state<input placeholder="License state" value={form.license_state} onChange={(e) => onChange({ ...form, license_state: e.target.value.toUpperCase().slice(0, 2) })} required /></label>
        </div>
      </fieldset>
      <fieldset className="form-fieldset">
        <legend>Payment</legend>
        <div className="field-grid two-col">
          <label>Card type<input placeholder="Card type" value={form.credit_card_type} onChange={(e) => onChange({ ...form, credit_card_type: e.target.value })} required /></label>
          <label>Card number<input placeholder="Card number" value={form.credit_card_number} onChange={(e) => onChange({ ...form, credit_card_number: e.target.value })} required /></label>
          <label>Exp month<input placeholder="Exp month" type="number" min="1" max="12" value={form.exp_month} onChange={(e) => onChange({ ...form, exp_month: e.target.value })} required /></label>
          <label>Exp year<input placeholder="Exp year" type="number" min={new Date().getFullYear()} value={form.exp_year} onChange={(e) => onChange({ ...form, exp_year: e.target.value })} required /></label>
        </div>
      </fieldset>
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}
