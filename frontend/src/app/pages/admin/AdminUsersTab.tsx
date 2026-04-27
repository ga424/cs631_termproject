import { useMemo, useState } from "react";
import type * as React from "react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { api } from "../../lib/api";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard } from "../../components/ui";
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
  const [showForm, setShowForm] = useState(false);
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
      setShowForm(false);
      return;
    }

    await staff.perform(async () => {
      await api.createCustomerAccount(payload);
      await reloadAccounts();
      setForm(DEFAULT_ACCOUNT_FORM);
    }, "Customer account created.");
    setShowForm(false);
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
    setShowForm(true);
  }

  function resetForm() {
    setEditingAccountId(null);
    setForm(DEFAULT_ACCOUNT_FORM);
    setShowForm(false);
  }

  function boolFromGrid(value: unknown) {
    return value === true || value === "true";
  }

  async function updateAccountCell(event: CellValueChangedEvent<CustomerAccountAdmin>) {
    const field = event.colDef.field as keyof CustomerAccountAdmin | undefined;
    if (!field || event.oldValue === event.newValue) {
      return;
    }

    const normalizedValue = field === "is_active"
      ? boolFromGrid(event.newValue)
      : String(event.newValue ?? "").trim();

    await staff.perform(async () => {
      await api.updateCustomerAccount(event.data.account_id, { [field]: normalizedValue });
      await reloadAccounts();
    }, "Customer account updated.");
  }

  const accountColumns = useMemo<ColDef<CustomerAccountAdmin>[]>(() => ([
    { field: "username", headerName: "Username", editable: true, minWidth: 170 },
    {
      field: "is_active",
      headerName: "Status",
      editable: true,
      cellEditor: "agSelectCellEditor",
      cellEditorParams: { values: [true, false] },
      valueParser: (params) => boolFromGrid(params.newValue),
      valueFormatter: (params: ValueFormatterParams<CustomerAccountAdmin, boolean>) => params.value ? "Active" : "Inactive",
      minWidth: 130,
    },
    { field: "first_name", headerName: "First", editable: true, minWidth: 140 },
    { field: "last_name", headerName: "Last", editable: true, minWidth: 140 },
    { field: "city", headerName: "City", editable: true, minWidth: 150 },
    { field: "state", headerName: "State", editable: true, minWidth: 110, valueParser: (params) => String(params.newValue ?? "").toUpperCase().slice(0, 2) },
    { field: "last_login_at", headerName: "Last Login", valueFormatter: (params) => params.value ? new Date(String(params.value)).toLocaleString() : "Never", minWidth: 190 },
    { field: "created_at", headerName: "Created", valueFormatter: (params) => new Date(String(params.value)).toLocaleDateString(), minWidth: 140 },
    {
      headerName: "Actions",
      editable: false,
      filter: false,
      sortable: false,
      pinned: "right",
      width: 250,
      cellRenderer: (params: ICellRendererParams<CustomerAccountAdmin>) => (
        <div className="grid-action-group">
          <button type="button" className="grid-action-button" onClick={() => params.data && editAccount(params.data)}>Edit</button>
          <button type="button" className="grid-action-button" onClick={() => params.data && void toggleAccount(params.data)}>
            {params.data?.is_active ? "Deactivate" : "Activate"}
          </button>
          <button type="button" className="grid-action-button danger" onClick={() => params.data && void removeAccount(params.data.account_id, params.data.username)}>Delete</button>
        </div>
      ),
    },
  ]), [staff]);

  return (
    <>
      <SectionCard title="Customer Account Management" subtitle="Create, update, activate/deactivate, and delete registered customer accounts.">
        <div className="action-strip">
          <button type="button" onClick={() => { setEditingAccountId(null); setForm(DEFAULT_ACCOUNT_FORM); setShowForm((value) => !value); }}>
            {showForm && !editingAccountId ? "Hide Create User" : "Create Customer Account"}
          </button>
          <button type="button" className="ghost-button" onClick={() => void reloadAccounts()}>Refresh List</button>
        </div>
        {showForm ? (
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
              <button type="button" className="ghost-button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        ) : null}
      </SectionCard>

      <SectionCard title="Registered Users" subtitle="Inline edit username, status, name, and location. Use Edit for full identity, license, payment, or password changes.">
        <div className="stack-form">
          <input placeholder="Search users" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {accountsLoading ? <div className="loading-strip">Syncing customer accounts...</div> : null}
        <AdminDataGrid
          rows={filteredAccounts}
          columns={accountColumns}
          getRowId={(account) => account.account_id}
          emptyText="No customer accounts found."
          height={470}
          onCellValueChanged={updateAccountCell}
        />
      </SectionCard>
    </>
  );
}
