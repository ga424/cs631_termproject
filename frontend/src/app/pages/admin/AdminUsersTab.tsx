import { useMemo, useState } from "react";
import type * as React from "react";
import { api } from "../../lib/api";
import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { CustomerAccountAdmin } from "../../lib/types";

const DEFAULT_ACCOUNT_FORM = {
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
  exp_month: `${12}`,
  exp_year: `${new Date().getFullYear() + 2}`,
  is_active: true,
};

type AccountFormState = typeof DEFAULT_ACCOUNT_FORM;

function deriveFormFromAccount(account: CustomerAccountAdmin, staff: StaffData): AccountFormState {
  const customer = staff.customerById[account.customer_id];
  return {
    username: account.username,
    password: "",
    first_name: customer?.first_name || account.first_name,
    last_name: customer?.last_name || account.last_name,
    street: customer?.street || "",
    city: customer?.city || account.city,
    state: customer?.state || account.state,
    zip: customer?.zip || "",
    license_number: customer?.license_number || "",
    license_state: customer?.license_state || "NJ",
    credit_card_type: customer?.credit_card_type || "Visa",
    credit_card_number: customer?.credit_card_number || "",
    exp_month: String(customer?.exp_month || 12),
    exp_year: String(customer?.exp_year || new Date().getFullYear() + 2),
    is_active: account.is_active,
  };
}

export function AdminUsersTab({
  staff,
  accounts,
  accountsLoading,
  reloadAccounts,
}: {
  staff: StaffData;
  accounts: CustomerAccountAdmin[];
  accountsLoading: boolean;
  reloadAccounts: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_ACCOUNT_FORM);

  const filteredAccounts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return accounts;
    }
    return accounts.filter((account) => {
      const customer = staff.customerById[account.customer_id];
      const fullName = customer ? `${customer.first_name} ${customer.last_name}` : `${account.first_name} ${account.last_name}`;
      const haystack = [
        account.username,
        account.city,
        account.state,
        fullName,
        customer?.license_number || "",
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [accounts, query, staff.customerById]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      exp_month: Number(form.exp_month),
      exp_year: Number(form.exp_year),
      state: form.state.toUpperCase().slice(0, 2),
      license_state: form.license_state.toUpperCase().slice(0, 2),
    };

    if (editingAccountId) {
      await staff.perform(async () => {
        await api.updateCustomerAccount(editingAccountId, {
          ...payload,
          password: form.password ? form.password : undefined,
        });
        await reloadAccounts();
      }, "Customer account updated.");
      return;
    }

    await staff.perform(async () => {
      await api.createCustomerAccount(payload);
      await reloadAccounts();
      setForm(DEFAULT_ACCOUNT_FORM);
    }, "Customer account created.");
  }

  async function removeAccount(accountId: string, username: string) {
    if (!window.confirm(`Delete account ${username}?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteCustomerAccount(accountId);
      await reloadAccounts();
      if (editingAccountId === accountId) {
        setEditingAccountId(null);
        setForm(DEFAULT_ACCOUNT_FORM);
      }
    }, "Customer account deleted.");
  }

  async function toggleAccount(account: CustomerAccountAdmin) {
    await staff.perform(async () => {
      await api.updateCustomerAccount(account.account_id, { is_active: !account.is_active });
      await reloadAccounts();
    }, account.is_active ? "Customer account deactivated." : "Customer account reactivated.");
  }

  function editAccount(account: CustomerAccountAdmin) {
    setEditingAccountId(account.account_id);
    setForm(deriveFormFromAccount(account, staff));
  }

  function resetForm() {
    setEditingAccountId(null);
    setForm(DEFAULT_ACCOUNT_FORM);
  }

  return (
    <>
      <SectionCard title="Admin User Management" subtitle="Create, update, activate/deactivate, and delete registered customer accounts.">
        <form className="stack-form" onSubmit={submit}>
          <div className="field-grid two-col">
            <input placeholder="Username" value={form.username} onChange={(e) => setForm((c) => ({ ...c, username: e.target.value }))} required />
            <input placeholder={editingAccountId ? "New password (optional)" : "Password"} value={form.password} onChange={(e) => setForm((c) => ({ ...c, password: e.target.value }))} required={!editingAccountId} />
            <input placeholder="First name" value={form.first_name} onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))} required />
            <input placeholder="Last name" value={form.last_name} onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))} required />
            <input placeholder="Street" value={form.street} onChange={(e) => setForm((c) => ({ ...c, street: e.target.value }))} required />
            <input placeholder="City" value={form.city} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} required />
            <input placeholder="State" value={form.state} onChange={(e) => setForm((c) => ({ ...c, state: e.target.value.toUpperCase().slice(0, 2) }))} required />
            <input placeholder="ZIP" value={form.zip} onChange={(e) => setForm((c) => ({ ...c, zip: e.target.value }))} required />
            <input placeholder="License number" value={form.license_number} onChange={(e) => setForm((c) => ({ ...c, license_number: e.target.value }))} required />
            <input placeholder="License state" value={form.license_state} onChange={(e) => setForm((c) => ({ ...c, license_state: e.target.value.toUpperCase().slice(0, 2) }))} required />
            <input placeholder="Card type" value={form.credit_card_type} onChange={(e) => setForm((c) => ({ ...c, credit_card_type: e.target.value }))} required />
            <input placeholder="Card number" value={form.credit_card_number} onChange={(e) => setForm((c) => ({ ...c, credit_card_number: e.target.value }))} required />
            <input type="number" min="1" max="12" placeholder="Exp month" value={form.exp_month} onChange={(e) => setForm((c) => ({ ...c, exp_month: e.target.value }))} required />
            <input type="number" min={new Date().getFullYear()} placeholder="Exp year" value={form.exp_year} onChange={(e) => setForm((c) => ({ ...c, exp_year: e.target.value }))} required />
          </div>
          <label className="stack-label checkbox-line">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))} />
            Account active
          </label>
          <div className="action-strip">
            <button type="submit">{editingAccountId ? "Update User" : "Create User"}</button>
            <button type="button" className="ghost-button" onClick={resetForm}>Clear</button>
            <button type="button" className="ghost-button" onClick={() => void reloadAccounts()}>Refresh List</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Registered Users" subtitle="Filter users by username, name, location, or license.">
        <div className="stack-form">
          <input placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {accountsLoading ? <div className="loading-strip">Syncing customer accounts...</div> : null}
        <QueueList
          title="Customer accounts"
          items={filteredAccounts.map((account) => {
            const customer = staff.customerById[account.customer_id];
            return {
              id: account.account_id,
              title: `${account.username} (${account.is_active ? "active" : "inactive"})`,
              subtitle: `${customer?.first_name || account.first_name} ${customer?.last_name || account.last_name} · ${account.city}, ${account.state}`,
              meta: customer?.license_number || "License pending",
            };
          })}
          emptyText="No customer accounts found."
        />
        <div className="action-strip wrap-actions">
          {filteredAccounts.slice(0, 12).map((account) => (
            <div key={account.account_id} className="compact-actions">
              <button type="button" className="ghost-button" onClick={() => editAccount(account)}>Edit {account.username}</button>
              <button type="button" className="ghost-button" onClick={() => void toggleAccount(account)}>{account.is_active ? "Deactivate" : "Activate"}</button>
              <button type="button" className="danger-mini" onClick={() => void removeAccount(account.account_id, account.username)}>Delete</button>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
