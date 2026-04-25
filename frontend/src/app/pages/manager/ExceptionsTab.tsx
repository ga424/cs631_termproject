import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

export function ExceptionsTab({ staff }: { staff: StaffData }) {
  return (
    <SectionCard title="Workflow Exceptions" subtitle="Surface overdue rentals, blocked pickups, and time-sensitive branch work.">
      <QueueList title="Manager alerts" items={staff.managerAlerts} emptyText="No critical workflow exceptions right now." />
    </SectionCard>
  );
}
