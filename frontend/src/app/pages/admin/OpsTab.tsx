import { QueueList, SectionCard, StatGrid } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

export function OpsTab({ staff }: { staff: StaffData }) {
  return (
    <>
      <StatGrid stats={staff.stats} />
      <SectionCard title="Operational Health" subtitle="Admin oversight of live branch activity and configuration-sensitive workflows.">
        <QueueList title="Priority admin watchlist" items={staff.managerAlerts.slice(0, 6)} emptyText="No elevated branch issues." />
      </SectionCard>
    </>
  );
}
