import { useCallback, useEffect, useState } from "react";
import * as React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip } from "../../components/ui";
import { api } from "../../lib/api";
import type { CustomerAccountAdmin } from "../../lib/types";
import { OpsTab } from "./OpsTab";
import { FleetTab } from "./FleetTab";
import { PricingTab } from "./PricingTab";
import { AdminWorkflowTab } from "./AdminWorkflowTab";
import { AdminUsersTab } from "./AdminUsersTab";
import { AdminReservationsTab } from "./AdminReservationsTab";
import { AdminSearchTab } from "./AdminSearchTab";

const TABS = [
  { id: "operations", label: "Ops" },
  { id: "users", label: "Users" },
  { id: "reservations", label: "Reservations" },
  { id: "search", label: "Search" },
  { id: "inventory", label: "Fleet" },
  { id: "pricing", label: "Pricing" },
  { id: "workflow", label: "Workflow" },
];

export function AdminConsole() {
  const { logout } = useAuth();
  const staff = useStaffData();
  const [activeTab, setActiveTab] = useState("operations");
  const [locationForm, setLocationForm] = useState({ street: "", city: "", state: "", zip: "" });
  const [classForm, setClassForm] = useState({ class_name: "", daily_rate: "", weekly_rate: "" });
  const [modelForm, setModelForm] = useState({ model_name: "", make_name: "", model_year: "", class_id: "" });
  const [carForm, setCarForm] = useState({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });
  const [accounts, setAccounts] = useState<CustomerAccountAdmin[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const reloadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const records = await api.listCustomerAccounts();
      setAccounts(records);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAccounts();
  }, [reloadAccounts]);

  async function createLocation(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createLocation(locationForm);
      setCarForm((current) => ({ ...current, location_id: created.location_id }));
      setLocationForm({ street: "", city: "", state: "", zip: "" });
    }, "Location created.");
  }

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createCarClass({
        class_name: classForm.class_name,
        daily_rate: Number(classForm.daily_rate),
        weekly_rate: Number(classForm.weekly_rate),
      });
      setModelForm((current) => ({ ...current, class_id: created.class_id }));
      setClassForm({ class_name: "", daily_rate: "", weekly_rate: "" });
    }, "Car class created.");
  }

  async function createModel(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      const created = await api.createModel({
        model_name: modelForm.model_name,
        make_name: modelForm.make_name,
        model_year: Number(modelForm.model_year),
        class_id: modelForm.class_id,
      });
      setCarForm((current) => ({ ...current, model_name: created.model_name }));
      setModelForm({ model_name: "", make_name: "", model_year: "", class_id: "" });
    }, "Model created.");
  }

  async function createCar(event: React.FormEvent) {
    event.preventDefault();
    await staff.perform(async () => {
      await api.createCar({
        vin: carForm.vin,
        current_odometer_reading: Number(carForm.current_odometer_reading),
        location_id: carForm.location_id,
        model_name: carForm.model_name,
      });
      setCarForm({ vin: "", current_odometer_reading: "", location_id: "", model_name: "" });
    }, "Car added to fleet.");
  }

  async function deleteLocation(locationId: string, city: string) {
    if (!window.confirm(`Delete ${city} location?`)) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteLocation(locationId);
    }, `${city} location deleted.`);
  }

  return (
    <MobileLayout
      title="Rental Admin Console"
      subtitle="Maintain branch setup, fleet records, pricing, and BPMN-aligned operating controls."
      role="admin"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={staff.error} success={staff.success} />
      {staff.loading ? <div className="loading-strip">Syncing admin controls…</div> : null}
      {activeTab === "operations" ? <OpsTab staff={staff} /> : null}
      {activeTab === "users" ? (
        <AdminUsersTab
          staff={staff}
          accounts={accounts}
          accountsLoading={accountsLoading}
          reloadAccounts={reloadAccounts}
        />
      ) : null}
      {activeTab === "reservations" ? <AdminReservationsTab staff={staff} /> : null}
      {activeTab === "search" ? <AdminSearchTab staff={staff} accounts={accounts} /> : null}
      {activeTab === "inventory" ? (
        <FleetTab
          staff={staff}
          locationForm={locationForm}
          carForm={carForm}
          setLocationForm={setLocationForm}
          setCarForm={setCarForm}
          createLocation={createLocation}
          createCar={createCar}
          deleteLocation={deleteLocation}
        />
      ) : null}
      {activeTab === "pricing" ? (
        <PricingTab
          staff={staff}
          classForm={classForm}
          modelForm={modelForm}
          setClassForm={setClassForm}
          setModelForm={setModelForm}
          createClass={createClass}
          createModel={createModel}
        />
      ) : null}
      {activeTab === "workflow" ? <AdminWorkflowTab /> : null}
    </MobileLayout>
  );
}
