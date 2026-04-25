import { formatCurrency, formatDateTime } from "../../lib/api";
import { WorkflowTracker } from "../../components/ui";
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
  const returnBranch = locationById[reservation.return_location_id || reservation.location_id];
  const carClass = classById[reservation.class_id];
  const activeIndex = activeRental
    ? rentalStepIndex(Boolean(activeRental.rental_end_date_time))
    : reservationStepIndex(reservation.reservation_status);
  const events = summary.lifecycle_events.filter((event) => event.reservation_id === reservation.reservation_id);
  const tripStatus = activeRental
    ? activeRental.rental_end_date_time
      ? "Returned / Billed"
      : "Active rental"
    : reservation.reservation_status === "FULFILLED"
      ? "Returned / Billed"
      : reservation.reservation_status === "ACTIVE"
        ? "Reserved"
        : reservation.reservation_status.replace("_", "-");
  const nextAction = activeRental && !activeRental.rental_end_date_time
    ? "Return vehicle"
    : reservation.reservation_status === "ACTIVE"
      ? "Arrive for pickup"
      : "Review trip history";

  return (
    <details className="reservation-drilldown">
      <summary>
        <span>
          <strong>{carClass?.class_name || "Reserved vehicle"} · {tripStatus}</strong>
          <small>Pick up {formatDateTime(reservation.pickup_date_time)} · Drop off {formatDateTime(reservation.return_date_time_requested)}</small>
        </span>
        <em>{branch ? `${branch.city}, ${branch.state}` : "Pick-up branch"}</em>
      </summary>
      <div className="reservation-detail-grid">
        <div className="identity-card">
          <strong>Pick-up</strong>
          <span>{branch ? `${branch.city}, ${branch.state}` : "Branch pending"}</span>
          <p>{formatDateTime(reservation.pickup_date_time)}</p>
        </div>
        <div className="identity-card">
          <strong>Drop-off</strong>
          <span>{returnBranch ? `${returnBranch.city}, ${returnBranch.state}` : "Branch pending"}</span>
          <p>{formatDateTime(reservation.return_date_time_requested)}</p>
        </div>
        <div className="identity-card">
          <strong>Trip status</strong>
          <span>{tripStatus}</span>
          <p>{activeRental ? `Assigned VIN ${activeRental.vin}` : "Pickup assignment will be completed by an agent."}</p>
        </div>
        <div className="identity-card">
          <strong>Next action</strong>
          <span>{nextAction}</span>
          <p>{activeRental ? "Return the vehicle by the requested return time for closeout and billing." : "Bring license and payment to the selected branch at pickup time."}</p>
        </div>
        {activeRental ? (
          <div className="identity-card">
            <strong>Odometer and billing</strong>
            <span>Pickup {activeRental.start_odometer_reading.toLocaleString()} mi</span>
            <p>
              {activeRental.end_odometer_reading
                ? `Returned at ${activeRental.end_odometer_reading.toLocaleString()} mi · ${formatCurrency(activeRental.actual_cost)}`
                : "Return odometer and final charge are captured at closeout."}
            </p>
          </div>
        ) : null}
      </div>
      {events.length ? (
        <ol className="audit-timeline" aria-label="Trip audit trail">
          {events.map((event) => (
            <li key={event.event_id}>
              <strong>{event.event_type.replace("_", " ")}</strong>
              <dl className="audit-meta">
                <div>
                  <dt>Who</dt>
                  <dd>{event.actor_role} · {event.actor_username}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>{formatDateTime(event.event_timestamp)}</dd>
                </div>
              </dl>
              {event.notes ? <p>{event.notes}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
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
  const currentTrips = summary?.reservations.filter((item) => {
    const rental = summary.rental_agreements.find((agreement) => agreement.reservation_id === item.reservation_id);
    return item.reservation_status === "ACTIVE" || Boolean(rental && !rental.rental_end_date_time);
  }) || [];
  const historicalTrips = summary?.reservations.filter((item) => !currentTrips.some((trip) => trip.reservation_id === item.reservation_id)) || [];
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
          <h2>My Trips</h2>
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
            <h3>Current Trip</h3>
            {currentTrips.length ? (
              <div className="reservation-stack">
                {currentTrips.map((item) => {
                  const rentalForReservation = summary.rental_agreements.find((rental) => rental.reservation_id === item.reservation_id);
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
              <div className="empty-block">No current reservation or active rental.</div>
            )}
          </div>
          <div className="queue-card reservation-board">
            <h3>Historical Trips</h3>
            {historicalTrips.length ? (
              <div className="reservation-stack">
                {historicalTrips.map((item) => {
                  const rentalForReservation = summary.rental_agreements.find((rental) => rental.reservation_id === item.reservation_id);
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
              <div className="empty-block">No completed, canceled, or no-show trips yet.</div>
            )}
          </div>
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
