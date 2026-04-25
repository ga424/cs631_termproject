import { WorkflowTracker } from "../../components/ui";
import type { CustomerPortalCatalog, CustomerPortalSummary } from "../../lib/types";
import { reservationStepIndex } from "../../lib/workflows";

export function WorkflowTab({ catalog, summary }: { catalog: CustomerPortalCatalog; summary: CustomerPortalSummary | null }) {
  const primaryRental = summary?.rental_agreements[0];

  return (
    <WorkflowTracker
      stages={catalog.workflow}
      activeIndex={primaryRental ? (primaryRental.rental_end_date_time ? 4 : 3) : reservationStepIndex(summary?.reservations[0]?.reservation_status)}
      title="Workflow ownership"
    />
  );
}
