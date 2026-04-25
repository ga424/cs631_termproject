import { useState } from "react";
import { formatCurrency } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useStaffData } from "../../hooks/useStaffData";
import { MobileLayout } from "../../components/MobileLayout";
import { AlertStrip, QueueList, SectionCard, StatGrid, WorkflowTracker } from "../../components/ui";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "exceptions", label: "Exceptions" },
  { id: "workflow", label: "Workflow" },
];

const STAFF_WORKFLOW = [
  { stage_id: "customer-intake", label: "Customer Intake", owner_role: "agent", description: "Capture a caller or walk-in customer and validate identity and payment details." },
  { stage_id: "reservation-active", label: "Reservation Active", owner_role: "customer", description: "Reservation is confirmed and waiting for the pickup window." },
  { stage_id: "pickup-assignment", label: "Pickup Assignment", owner_role: "agent", description: "Assign a matching VIN and convert the reservation into an active rental agreement." },
  { stage_id: "rental-live", label: "Rental In Progress", owner_role: "customer", description: "Vehicle is in use and should remain visible in queue, branch, and customer views." },
  { stage_id: "return-billing", label: "Return And Billing", owner_role: "agent", description: "Close the contract, capture mileage, and compute final billing." },
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

      {activeTab === "overview" ? (
        <>
          <StatGrid stats={staff.stats} />
          <SectionCard title="Branch visibility" subtitle="Monitor utilization, class mix, and branch readiness from a compact mobile dashboard.">
            <div className="queue-grid">
              <QueueList
                title="Locations"
                items={(staff.dashboard?.locations || []).map((item) => ({
                  id: item.location_id,
                  title: item.location_name,
                  subtitle: `${item.available_cars} available · ${item.rented_cars} rented`,
                  meta: `${item.utilization_percent.toFixed(1)}% utilized`,
                }))}
                emptyText="No branch data loaded."
              />
              <QueueList
                title="Class rates"
                items={(staff.dashboard?.rates || []).map((item) => ({
                  id: item.class_id,
                  title: item.class_name,
                  subtitle: `${formatCurrency(item.daily_rate)} day / ${formatCurrency(item.weekly_rate)} week`,
                  meta: `${item.vehicle_count} vehicles`,
                }))}
                emptyText="No rate data available."
              />
            </div>
          </SectionCard>
        </>
      ) : null}

      {activeTab === "exceptions" ? (
        <SectionCard title="Workflow Exceptions" subtitle="Surface overdue rentals, blocked pickups, and time-sensitive branch work.">
          <QueueList title="Manager alerts" items={staff.managerAlerts} emptyText="No critical workflow exceptions right now." />
        </SectionCard>
      ) : null}

      {activeTab === "workflow" ? (
        <SectionCard title="BPMN Workflow Lens" subtitle="A manager view of the reservation-to-return operating model.">
          <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={3} title="Branch workflow" />
        </SectionCard>
      ) : null}
    </MobileLayout>
  );
}
