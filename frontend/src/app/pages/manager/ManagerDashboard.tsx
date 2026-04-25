import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip } from "../../components/ui";
import { OverviewTab } from "./OverviewTab";
import { ExceptionsTab } from "./ExceptionsTab";
import { ManagerWorkflowTab } from "./ManagerWorkflowTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "exceptions", label: "Exceptions" },
  { id: "workflow", label: "Workflow" },
];

export function ManagerDashboard() {
  const { logout } = useAuth();
  const staff = useStaffData();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <MobileLayout
      title="Manager Dashboard"
      subtitle="Track branch health, blocked cases, overdue returns, and workflow throughput."
      role="manager"
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={logout}
    >
      <AlertStrip error={staff.error} success={staff.success} />
      {staff.loading ? <div className="loading-strip">Syncing management metrics…</div> : null}

      {activeTab === "overview" ? <OverviewTab staff={staff} /> : null}
      {activeTab === "exceptions" ? <ExceptionsTab staff={staff} /> : null}
      {activeTab === "workflow" ? <ManagerWorkflowTab /> : null}
    </MobileLayout>
  );
}
