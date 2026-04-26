import type { WorkflowStage } from "./types";

export const STAFF_WORKFLOW: WorkflowStage[] = [
  { stage_id: "customer-intake", label: "Customer Intake", owner_role: "agent", description: "Capture a caller or walk-in customer and validate identity and payment details." },
  { stage_id: "reservation-active", label: "Reservation Active", owner_role: "customer", description: "Reservation is confirmed and waiting for the pickup window." },
  { stage_id: "pickup-assignment", label: "Pickup Assignment", owner_role: "agent", description: "Assign a matching VIN and convert the reservation into an active rental agreement." },
  { stage_id: "rental-live", label: "Rental In Progress", owner_role: "customer", description: "Vehicle is in use and should remain visible in queue, branch, and customer views." },
  { stage_id: "return-billing", label: "Return And Billing", owner_role: "agent", description: "Close the contract, capture mileage, and compute final billing." },
];

export const ADMIN_WORKFLOW: WorkflowStage[] = [
  ...STAFF_WORKFLOW,
  { stage_id: "fleet-admin", label: "Fleet And Pricing Maintenance", owner_role: "admin", description: "Keep inventory, location, and rate setup aligned with branch operations." },
];

export function reservationStepIndex(status?: string) {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return 1;
    case "FULFILLED":
    case "COMPLETED":
      return 3;
    case "CANCELED":
    case "NO_SHOW":
      return 1;
    default:
      return 0;
  }
}

export function rentalStepIndex(hasClosedRental: boolean) {
  return hasClosedRental ? 4 : 3;
}
