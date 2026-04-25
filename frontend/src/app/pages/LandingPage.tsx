import { useState } from "react";
import { LandingHero, PersonaSelector, SignInPanel, type LoginFormState } from "../components/landing";
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

  function focusSignIn() {
    document.getElementById("sign-in-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="landing-shell">
      <LandingHero onStart={focusSignIn} />
      <section className="landing-workspace" aria-label="Choose a role and sign in">
        <div className="landing-role-copy">
          <p className="eyebrow">Role Workspaces</p>
          <h2>Each user lands in the tools they need.</h2>
          <p>
            Choose a persona to preload demo credentials, then sign in to open the matching workflow surface.
          </p>
          <PersonaSelector selectedRole={form.username} onSelect={selectRole} />
        </div>
        <SignInPanel
          form={form}
          loading={loading}
          error={error}
          success={success}
          onChange={setForm}
          onSubmit={handleLogin}
        />
      </section>
    </main>
  );
}
