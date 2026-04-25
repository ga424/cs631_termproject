import { formatDateTime } from "../../lib/api";
import { QueueList, WorkflowTracker } from "../../components/ui";
import type { CarClass, CustomerPortalSummary, Location, RentalAgreement, Reservation } from "../../lib/types";
import { rentalStepIndex, reservationStepIndex } from "../../lib/workflows";

function ReservationDrilldown({
  reservation,
  activeRental,
  summary,
  locationById,
  classById,
}: {
  reservation: Reservation;
  activeRental: RentalAgreement | undefined;
  summary: CustomerPortalSummary;
  locationById: Record<string, Location>;
  classById: Record<string, CarClass>;
}) {
  const branch = locationById[reservation.location_id];
  const carClass = classById[reservation.class_id];
  const activeIndex = activeRental
    ? rentalStepIndex(Boolean(activeRental.rental_end_date_time))
    : reservationStepIndex(reservation.reservation_status);

  return (
    <details className="reservation-drilldown">
      <summary>
        <span>
          <strong>{carClass?.class_name || "Reserved vehicle"} · {reservation.reservation_status}</strong>
          <small>{formatDateTime(reservation.pickup_date_time)} to {formatDateTime(reservation.return_date_time_requested)}</small>
        </span>
        <em>{branch ? `${branch.city}, ${branch.state}` : "Branch"}</em>
      </summary>
      <div className="reservation-detail-grid">
        <div className="identity-card">
          <strong>Trip status</strong>
          <span>{activeRental ? "Rental in progress" : reservation.reservation_status}</span>
          <p>{activeRental ? `Assigned VIN ${activeRental.vin}` : "Pickup assignment will be completed by an agent."}</p>
        </div>
        <div className="identity-card">
          <strong>Next action</strong>
          <span>{activeRental ? "Return vehicle" : "Arrive for pickup"}</span>
          <p>{activeRental ? "Return the vehicle by the requested return time for closeout and billing." : "Bring license and payment to the selected branch at pickup time."}</p>
        </div>
      </div>
      <WorkflowTracker stages={summary.workflow} activeIndex={activeIndex} title="Reservation journey" />
    </details>
  );
}

export function MyTripTab({
  summary,
  locationById,
  classById,
  onRefresh,
  onReserve,
}: {
  summary: CustomerPortalSummary | null;
  locationById: Record<string, Location>;
  classById: Record<string, CarClass>;
  onRefresh: () => void;
  onReserve: () => void;
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
        <div className="action-strip inline-actions">
          <button type="button" className="ghost-button" onClick={onRefresh}>Refresh</button>
          <button type="button" onClick={onReserve}>Reserve A Car</button>
        </div>
      </div>
      {summary ? (
        <div className="stack-area">
          <div className="identity-card trip-summary">
            <strong>{summary.customer.first_name} {summary.customer.last_name}</strong>
            <span>{summary.customer.license_state}-{summary.customer.license_number}</span>
            <p>{nextAction}</p>
          </div>
          <div className="queue-card reservation-board">
            <h3>Reservations</h3>
            {summary.reservations.length ? (
              <div className="reservation-stack">
                {summary.reservations.map((item) => {
                  const rentalForReservation = summary.active_rentals.find((rental) => rental.reservation_id === item.reservation_id);
                  return (
                    <ReservationDrilldown
                      key={item.reservation_id}
                      reservation={item}
                      activeRental={rentalForReservation}
                      summary={summary}
                      locationById={locationById}
                      classById={classById}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="empty-block">No reservations created yet.</div>
            )}
          </div>
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
        </div>
      ) : (
        <div className="empty-block">
          <p>Create a reservation to unlock trip tracking.</p>
          <button type="button" onClick={onReserve}>Reserve A Car</button>
        </div>
      )}
    </section>
  );
}
