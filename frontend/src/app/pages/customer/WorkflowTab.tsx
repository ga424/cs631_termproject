import { WorkflowTracker } from "../../components/ui";
import type { CustomerPortalCatalog, CustomerPortalSummary } from "../../lib/types";
import { reservationStepIndex } from "../../lib/workflows";

export function WorkflowTab({ catalog, summary }: { catalog: CustomerPortalCatalog; summary: CustomerPortalSummary | null }) {
  return (
    <WorkflowTracker
      stages={catalog.workflow}
      activeIndex={summary?.active_rentals[0] ? 3 : reservationStepIndex(summary?.reservations[0]?.reservation_status)}
      title="Workflow ownership"
    />
  );
}
