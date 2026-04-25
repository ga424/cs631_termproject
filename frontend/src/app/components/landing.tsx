import type { Role } from "../lib/types";
import { AlertStrip } from "./ui";

export const ROLE_COPY: Record<Role, { title: string; subtitle: string; metric: string }> = {
  customer: {
    title: "Customer Portal",
    subtitle: "Book a trip, follow reservations, and track an active rental.",
    metric: "Self-service",
  },
  agent: {
    title: "Agent Workspace",
    subtitle: "Handle walk-ins, pickups, returns, and branch exceptions.",
    metric: "Counter flow",
  },
  manager: {
    title: "Manager Dashboard",
    subtitle: "Track utilization, overdue returns, and workflow throughput.",
    metric: "Branch health",
  },
  admin: {
    title: "Rental Admin Console",
    subtitle: "Maintain locations, fleet records, pricing, and operating controls.",
    metric: "Fleet control",
  },
};

export type LoginFormState = {
  username: string;
  password: string;
};

export function LandingHero({ onStart }: { onStart: () => void }) {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-hero-copy">
        <p className="eyebrow">Rental Car Management</p>
        <h1 id="landing-title">Run reservations, rentals, and fleet operations from one workspace.</h1>
        <p>
          A role-based FastAPI and React system for customers, agents, managers, and admins with JWT access,
          operational dashboards, and BPMN-aligned workflows.
        </p>
        <div className="landing-actions">
          <button type="button" onClick={onStart}>Choose Persona</button>
          <a href="/docs" className="landing-link">Open API Docs</a>
        </div>
      </div>
      <OperationsVisual />
    </section>
  );
}

export function OperationsVisual() {
  return (
    <div className="operations-visual" aria-label="Fleet operations overview">
      <div className="visual-topline">
        <span>Live Branch View</span>
        <strong>94%</strong>
      </div>
      <div className="visual-map">
        <span className="map-node pickup">Pickup</span>
        <span className="map-road" />
        <span className="map-node return">Return</span>
      </div>
      <div className="visual-fleet">
        <article>
          <strong>SUV-204</strong>
          <span>Ready</span>
        </article>
        <article>
          <strong>EC-118</strong>
          <span>Rented</span>
        </article>
        <article>
          <strong>LUX-042</strong>
          <span>Return due</span>
        </article>
      </div>
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
  return (
    <div className="persona-cards" aria-label="Persona selector">
      {(Object.entries(ROLE_COPY) as Array<[Role, (typeof ROLE_COPY)[Role]]>).map(([role, copy]) => (
        <button
          key={role}
          type="button"
          className={selectedRole === role ? "persona-card active" : "persona-card"}
          onClick={() => onSelect(role)}
        >
          <span>{copy.metric}</span>
          <strong>{copy.title}</strong>
          <small>{copy.subtitle}</small>
        </button>
      ))}
    </div>
  );
}

export function SignInPanel({
  form,
  loading,
  error,
  success,
  onChange,
  onSubmit,
}: {
  form: LoginFormState;
  loading: boolean;
  error: string;
  success: string;
  onChange: (form: LoginFormState) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <form id="sign-in-panel" onSubmit={onSubmit} className="login-form">
      <div>
        <p className="eyebrow">Secure Access</p>
        <h2>Sign in by persona</h2>
      </div>
      <AlertStrip error={error} success={success} />
      <label>
        Username
        <input
          aria-label="Username"
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
          value={form.password}
          onChange={(event) => onChange({ ...form, password: event.target.value })}
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
