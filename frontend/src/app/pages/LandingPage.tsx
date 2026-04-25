import { useState } from "react";
import { MilanBrandHeader, PersonaSelector, SignInPanel, type LoginFormState } from "../components/landing";
import { useAuth } from "../contexts/AuthContext";
import { navigateTo } from "../lib/router";
import type { Role } from "../lib/types";

export function LandingPage() {
  const { login } = useAuth();
  const [form, setForm] = useState<LoginFormState>({ username: "customer", password: "customer123" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function selectRole(role: Role) {
    setForm({ username: role, password: `${role}123` });
    setError("");
    setSuccess("");
  }

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
    <main className="landing-shell">
      <section className="milan-login-shell" aria-label="Milan Rent-A-Car sign in">
        <MilanBrandHeader />
        <div className="milan-login-stack">
          <PersonaSelector selectedRole={form.username} onSelect={selectRole} />
          <SignInPanel
            form={form}
            loading={loading}
            error={error}
            success={success}
            onChange={setForm}
            onSubmit={handleLogin}
          />
          <div className="milan-login-footnote">
            <p>Demo app - select a role to preload credentials</p>
            <p>"Born from innovation, built to compete"</p>
          </div>
        </div>
      </section>
    </main>
  );
}
