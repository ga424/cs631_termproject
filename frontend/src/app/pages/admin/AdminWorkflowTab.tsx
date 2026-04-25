import { SectionCard, WorkflowTracker } from "../../components/ui";
import { ADMIN_WORKFLOW } from "../../lib/workflows";

export function AdminWorkflowTab() {
  return (
    <SectionCard title="Workflow Governance" subtitle="Admin alignment between branch duties, BPMN stages, and the mobile UI surfaces.">
      <WorkflowTracker stages={ADMIN_WORKFLOW} activeIndex={5} title="Admin BPMN coverage" />
    </SectionCard>
  );
}
