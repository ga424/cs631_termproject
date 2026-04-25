import type { Role } from "../lib/types";
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
  return (
    <div className="persona-cards login-personas" aria-label="Persona selector">
      {(Object.entries(ROLE_COPY) as Array<[Role, (typeof ROLE_COPY)[Role]]>).map(([role, copy]) => (
        <button
          key={role}
          type="button"
          aria-label={copy.surface}
          className={selectedRole === role ? `persona-card login-persona ${copy.tone} active` : `persona-card login-persona ${copy.tone}`}
          onClick={() => onSelect(role)}
        >
          <span className="persona-icon">{copy.icon}</span>
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
    <form id="sign-in-panel" onSubmit={onSubmit} className="login-form milan-login-card">
      <AlertStrip error={error} success={success} />
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
