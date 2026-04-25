import { formatDateTime } from "../../lib/api";
import { QueueList, WorkflowTracker } from "../../components/ui";
import type { CarClass, CustomerPortalSummary, Location } from "../../lib/types";
import { rentalStepIndex, reservationStepIndex } from "../../lib/workflows";

export function MyTripTab({
  summary,
  locationById,
  classById,
  onRefresh,
}: {
  summary: CustomerPortalSummary | null;
  locationById: Record<string, Location>;
  classById: Record<string, CarClass>;
  onRefresh: () => void;
}) {
  const activeRental = summary?.active_rentals[0];
  const reservation = summary?.reservations[0];
  const nextAction = activeRental
    ? "Return vehicle by the requested return time and complete billing with an agent."
    : reservation
      ? "Visit the pickup branch at your scheduled time with license and payment ready."
      : "Create a reservation to unlock trip tracking.";

  return (
    <section className="surface-card trip-board">
      <div className="surface-head">
        <div>
          <p className="eyebrow">Trip Status</p>
          <h2>My Reservation And Rental</h2>
          <p>{nextAction}</p>
        </div>
        <button type="button" className="ghost-button" onClick={onRefresh}>Refresh</button>
      </div>
      {summary ? (
        <div className="stack-area">
          <div className="identity-card trip-summary">
            <strong>{summary.customer.first_name} {summary.customer.last_name}</strong>
            <span>{summary.customer.license_state}-{summary.customer.license_number}</span>
            <p>{nextAction}</p>
          </div>
          <QueueList
            title="Reservations"
            items={summary.reservations.map((item) => ({
              id: item.reservation_id,
              title: `${classById[item.class_id]?.class_name || "Trip"} · ${item.reservation_status}`,
              subtitle: `${formatDateTime(item.pickup_date_time)} to ${formatDateTime(item.return_date_time_requested)}`,
              meta: locationById[item.location_id] ? `${locationById[item.location_id].city}, ${locationById[item.location_id].state}` : "Branch",
            }))}
            emptyText="No reservations created yet."
          />
          <QueueList
            title="Active rentals"
            items={summary.active_rentals.map((item) => ({
              id: item.contract_no,
              title: `Contract ${item.contract_no.slice(0, 8)}`,
              subtitle: `${item.vin} · started ${formatDateTime(item.rental_start_date_time)}`,
              meta: item.rental_end_date_time ? "Closed" : "In progress",
            }))}
            emptyText="No active rental at the moment."
          />
          <WorkflowTracker
            stages={summary.workflow}
            activeIndex={activeRental ? rentalStepIndex(Boolean(activeRental.rental_end_date_time)) : reservationStepIndex(reservation?.reservation_status)}
            title="Trip status"
          />
        </div>
      ) : (
        <div className="empty-block">Create a reservation to unlock trip tracking.</div>
      )}
    </section>
  );
}
