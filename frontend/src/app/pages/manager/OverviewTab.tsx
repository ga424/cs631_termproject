import { formatCurrency } from "../../lib/api";
import { QueueList, SectionCard, StatGrid } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";

export function OverviewTab({ staff }: { staff: StaffData }) {
  return (
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
  );
}
