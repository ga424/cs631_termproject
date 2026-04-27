import { useMemo, useState } from "react";
import type * as React from "react";
import { api, formatDateTime } from "../../lib/api";
import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { ReservationStatus } from "../../lib/types";

const STATUS_OPTIONS: ReservationStatus[] = ["ACTIVE", "CANCELED", "FULFILLED", "COMPLETED", "NO_SHOW"];

const DEFAULT_FORM = {
  customer_id: "",
  location_id: "",
  return_location_id: "",
  class_id: "",
  pickup_date_time: "",
  return_date_time_requested: "",
  reservation_status: "ACTIVE" as ReservationStatus,
};

type ReservationForm = typeof DEFAULT_FORM;

function toInputDateTime(value: string) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return shifted.toISOString().slice(0, 16);
}

export function AdminReservationsTab({ staff }: { staff: StaffData }) {
  const [query, setQuery] = useState("");
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [form, setForm] = useState<ReservationForm>(DEFAULT_FORM);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return staff.reservations;
    }
    return staff.reservations.filter((reservation) => {
      const customer = staff.customerById[reservation.customer_id];
      const location = staff.locationById[reservation.location_id];
      const carClass = staff.classById[reservation.class_id];
      const haystack = [
        reservation.reservation_id,
        reservation.reservation_status,
        customer ? `${customer.first_name} ${customer.last_name}` : "",
        customer?.license_number || "",
        location ? `${location.city} ${location.state}` : "",
        carClass?.class_name || "",
      ].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query, staff.classById, staff.customerById, staff.locationById, staff.reservations]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      ...form,
      return_location_id: form.return_location_id || null,
      pickup_date_time: new Date(form.pickup_date_time).toISOString(),
      return_date_time_requested: new Date(form.return_date_time_requested).toISOString(),
    };

    if (editingReservationId) {
      await staff.perform(async () => {
        await api.updateReservation(editingReservationId, payload);
      }, "Reservation updated.");
      return;
    }

    await staff.perform(async () => {
      await api.createReservation(payload);
      setForm(DEFAULT_FORM);
    }, "Reservation created.");
  }

  function startEdit(reservationId: string) {
    const reservation = staff.reservationById[reservationId];
    if (!reservation) {
      return;
    }
    setEditingReservationId(reservationId);
    setForm({
      customer_id: reservation.customer_id,
      location_id: reservation.location_id,
      return_location_id: reservation.return_location_id || "",
      class_id: reservation.class_id,
      pickup_date_time: toInputDateTime(reservation.pickup_date_time),
      return_date_time_requested: toInputDateTime(reservation.return_date_time_requested),
      reservation_status: reservation.reservation_status,
    });
  }

  function resetForm() {
    setEditingReservationId(null);
    setForm(DEFAULT_FORM);
  }

  async function updateStatus(reservationId: string, status: ReservationStatus) {
    await staff.perform(async () => {
      await api.updateReservationStatus(reservationId, status);
    }, `Reservation status set to ${status}.`);
  }

  async function removeReservation(reservationId: string) {
    if (!window.confirm("Delete reservation?")) {
      return;
    }
    await staff.perform(async () => {
      await api.deleteReservation(reservationId);
      if (editingReservationId === reservationId) {
        setEditingReservationId(null);
        setForm(DEFAULT_FORM);
      }
    }, "Reservation deleted.");
  }

  return (
    <>
      <SectionCard title="Admin Reservation Management" subtitle="Create, edit, update status, and delete reservation records.">
        <form className="stack-form" onSubmit={submit}>
          <div className="field-grid two-col">
            <select aria-label="Reservation customer" value={form.customer_id} onChange={(e) => setForm((c) => ({ ...c, customer_id: e.target.value }))} required>
              <option value="">Customer</option>
              {staff.customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>{customer.first_name} {customer.last_name}</option>
              ))}
            </select>
            <select aria-label="Reservation class" value={form.class_id} onChange={(e) => setForm((c) => ({ ...c, class_id: e.target.value }))} required>
              <option value="">Vehicle class</option>
              {staff.carClasses.map((item) => (
                <option key={item.class_id} value={item.class_id}>{item.class_name}</option>
              ))}
            </select>
            <select aria-label="Pickup location" value={form.location_id} onChange={(e) => setForm((c) => ({ ...c, location_id: e.target.value }))} required>
              <option value="">Pickup location</option>
              {staff.locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>{location.city}, {location.state}</option>
              ))}
            </select>
            <select aria-label="Return location" value={form.return_location_id} onChange={(e) => setForm((c) => ({ ...c, return_location_id: e.target.value }))}>
              <option value="">Return location (optional)</option>
              {staff.locations.map((location) => (
                <option key={location.location_id} value={location.location_id}>{location.city}, {location.state}</option>
              ))}
            </select>
            <label className="stack-label">
              Pickup
              <input type="datetime-local" value={form.pickup_date_time} onChange={(e) => setForm((c) => ({ ...c, pickup_date_time: e.target.value }))} required />
            </label>
            <label className="stack-label">
              Return
              <input type="datetime-local" value={form.return_date_time_requested} onChange={(e) => setForm((c) => ({ ...c, return_date_time_requested: e.target.value }))} required />
            </label>
          </div>
          <select aria-label="Reservation status" value={form.reservation_status} onChange={(e) => setForm((c) => ({ ...c, reservation_status: e.target.value as ReservationStatus }))} required>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="action-strip">
            <button type="submit">{editingReservationId ? "Update Reservation" : "Create Reservation"}</button>
            <button type="button" className="ghost-button" onClick={resetForm}>Clear</button>
            <button type="button" className="ghost-button" onClick={() => void staff.refresh()}>Refresh List</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Reservation List" subtitle="Search by reservation id, customer, location, class, or status.">
        <div className="stack-form">
          <input placeholder="Search reservations" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <QueueList
          title="Reservations"
          items={filteredReservations.map((reservation) => {
            const customer = staff.customerById[reservation.customer_id];
            const location = staff.locationById[reservation.location_id];
            return {
              id: reservation.reservation_id,
              title: `${reservation.reservation_status} · ${reservation.reservation_id.slice(0, 8)}`,
              subtitle: `${customer ? `${customer.first_name} ${customer.last_name}` : reservation.customer_id} · ${location ? `${location.city}, ${location.state}` : "Unknown location"}`,
              meta: `Pickup ${formatDateTime(reservation.pickup_date_time)}`,
            };
          })}
          emptyText="No reservations match this filter."
        />
        <div className="action-strip wrap-actions">
          {filteredReservations.slice(0, 12).map((reservation) => (
            <div key={reservation.reservation_id} className="compact-actions">
              <button type="button" className="ghost-button" onClick={() => startEdit(reservation.reservation_id)}>Edit</button>
              <button type="button" className="ghost-button" onClick={() => void updateStatus(reservation.reservation_id, "CANCELED")}>Cancel</button>
              <button type="button" className="ghost-button" onClick={() => void updateStatus(reservation.reservation_id, "NO_SHOW")}>No-show</button>
              <button type="button" className="ghost-button" onClick={() => void updateStatus(reservation.reservation_id, "COMPLETED")}>Complete</button>
              <button type="button" className="danger-mini" onClick={() => void removeReservation(reservation.reservation_id)}>Delete</button>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
