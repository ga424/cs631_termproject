import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../lib/router";
import type { Role } from "../lib/types";
import { AlertStrip } from "../components/ui";

const ROLE_COPY: Record<Role, { title: string; subtitle: string }> = {
  customer: {
    title: "Customer Portal",
    subtitle: "Book a trip, follow your reservation, and track your active rental from a mobile-first experience.",
  },
  agent: {
    title: "Agent Workspace",
    subtitle: "Handle intake, walk-ins, pickups, returns, and exceptions with a task-first branch workflow.",
  },
  manager: {
    title: "Manager Dashboard",
    subtitle: "Track branch health, blocked cases, overdue returns, and workflow throughput.",
  },
  admin: {
    title: "Rental Admin Console",
    subtitle: "Maintain branch setup, fleet records, pricing, and BPMN-aligned operating controls.",
  },
};

export function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "customer", password: "customer123" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await login(form);
      setSuccess(`Signed in as ${session.role}.`);
      navigateTo(`/${session.role}` as "/customer" | "/agent" | "/manager" | "/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <section className="login-panel">
        <div className="login-copy">
          <p className="eyebrow">Mobile-First Rentals</p>
          <h1>Sign in by persona</h1>
          <p>Each persona lands in a separate workflow surface with JWT auth and clear separation of duties.</p>
          <div className="persona-cards">
            {Object.entries(ROLE_COPY).map(([role, copy]) => (
              <button
                key={role}
                type="button"
                className={form.username === role ? "persona-card active" : "persona-card"}
                onClick={() => setForm({ username: role, password: `${role}123` })}
              >
                <strong>{copy.title}</strong>
                <span>{copy.subtitle}</span>
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <AlertStrip error={error} success={success} />
          <label>
            Username
            <input
              aria-label="Username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              aria-label="Password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </div>
  );
}
