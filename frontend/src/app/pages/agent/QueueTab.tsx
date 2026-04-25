import { formatDateTime } from "../../lib/api";
import { QueueList, SectionCard, WorkflowTracker } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import { STAFF_WORKFLOW } from "../../lib/workflows";

export function QueueTab({ staff }: { staff: StaffData }) {
  return (
    <>
      <SectionCard title="Priority queue" subtitle="Urgent pickups, active contracts, and branch work that needs attention first.">
        <div className="queue-grid">
          <QueueList
            title="Upcoming pickups"
            items={(staff.dashboard?.upcoming_pickups || []).map((item) => ({
              id: item.reservation_id,
              title: item.location_name,
              subtitle: formatDateTime(item.pickup_date_time),
              meta: item.reservation_status,
            }))}
            emptyText="No pickups due soon."
          />
          <QueueList
            title="Open rentals"
            items={staff.openRentals.map((item) => ({
              id: item.contract_no,
              title: item.vin,
              subtitle: `Started ${formatDateTime(item.rental_start_date_time)}`,
              meta: item.contract_no.slice(0, 8),
            }))}
            emptyText="No open rentals."
          />
        </div>
      </SectionCard>
      <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={2} title="Branch workflow" />
    </>
  );
}
