import { useEffect, useState } from "react";
import {
  MilanBrandHeader,
  PersonaSelector,
  SignInPanel,
  SignupPanel,
  type CustomerSignupFormState,
  type LoginFormState,
} from "../components/landing";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import { navigateTo } from "../lib/router";
import type { CustomerDemoAccount, Role } from "../lib/types";

const DEMO_CUSTOMER_PASSWORD = "customer123";

const DEFAULT_SIGNUP_FORM: CustomerSignupFormState = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  street: "",
  city: "",
  state: "NJ",
  zip: "",
  license_number: "",
  license_state: "NJ",
  credit_card_type: "Visa",
  credit_card_number: "",
  exp_month: "12",
  exp_year: `${new Date().getFullYear() + 2}`,
};

export function LandingPage() {
  const { login, signupCustomer } = useAuth();
  const [form, setForm] = useState<LoginFormState>({ username: "agent", password: "agent123" });
  const [signupForm, setSignupForm] = useState<CustomerSignupFormState>(DEFAULT_SIGNUP_FORM);
  const [demoCustomers, setDemoCustomers] = useState<CustomerDemoAccount[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    setDemoLoading(true);
    api.listDemoCustomers()
      .then((customers) => {
        if (active) {
          setDemoCustomers(customers);
        }
      })
      .catch(() => {
        if (active) {
          setDemoCustomers([]);
        }
      })
      .finally(() => {
        if (active) {
          setDemoLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function selectRole(role: Role) {
    if (role === "customer" && demoCustomers[0]) {
      selectDemoCustomer(demoCustomers[0]);
      return;
    }
    if (role === "customer") {
      setForm({ username: "john.doe", password: DEMO_CUSTOMER_PASSWORD });
      setError("");
      setSuccess("Loaded the default demo customer login.");
      return;
    }
    setForm({ username: role, password: `${role}123` });
    setError("");
    setSuccess("");
  }

  function selectDemoCustomer(customer: CustomerDemoAccount) {
    if (!customer.is_active) {
      return;
    }
    setForm({ username: customer.username, password: DEMO_CUSTOMER_PASSWORD });
    setError("");
    setSuccess(`Loaded ${customer.display_name}'s demo login.`);
  }

  function selectDemoCustomerByUsername(username: string) {
    const customer = demoCustomers.find((item) => item.username === username);
    if (customer) {
      selectDemoCustomer(customer);
    }
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

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signupCustomer({
        ...signupForm,
        exp_month: Number(signupForm.exp_month),
        exp_year: Number(signupForm.exp_year),
      });
      setSuccess("Customer account created.");
      navigateTo("/customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
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
          {!showRegister ? (
            <>
              <SignInPanel
                form={form}
                customers={demoCustomers}
                demoLoading={demoLoading}
                loading={loading}
                error={error}
                success={success}
                onChange={setForm}
                onCustomerSelect={selectDemoCustomerByUsername}
                onSubmit={handleLogin}
              />
              <button type="button" className="ghost-button full-width" onClick={() => setShowRegister(true)}>
                Register New Customer
              </button>
            </>
          ) : (
            <>
              <SignupPanel
                form={signupForm}
                loading={loading}
                onChange={setSignupForm}
                onSubmit={handleSignup}
              />
              <button type="button" className="ghost-button full-width" onClick={() => setShowRegister(false)}>
                Back To Sign In
              </button>
            </>
          )}
          <div className="milan-login-footnote">
            <p>Demo app - select staff or a seeded customer to preload credentials</p>
            <p>"Born from innovation, built to compete"</p>
          </div>
        </div>
      </section>
    </main>
  );
}
