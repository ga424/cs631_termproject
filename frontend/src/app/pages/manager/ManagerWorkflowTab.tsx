import { SectionCard, WorkflowTracker } from "../../components/ui";
import { STAFF_WORKFLOW } from "../../lib/workflows";

export function ManagerWorkflowTab() {
  return (
    <SectionCard title="BPMN Workflow Lens" subtitle="A manager view of the reservation-to-return operating model.">
      <WorkflowTracker stages={STAFF_WORKFLOW} activeIndex={3} title="Branch workflow" />
    </SectionCard>
  );
}
