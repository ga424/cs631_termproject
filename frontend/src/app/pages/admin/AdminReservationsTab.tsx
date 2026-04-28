import { useMemo, useState } from "react";
import type * as React from "react";
import type { CellValueChangedEvent, ColDef, ICellRendererParams } from "ag-grid-community";
import { api, formatDateTime } from "../../lib/api";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { Reservation, ReservationStatus } from "../../lib/types";

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
  const [showForm, setShowForm] = useState(false);
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
      const ok = await staff.perform(async () => {
        await api.updateReservation(editingReservationId, payload);
      }, "Reservation updated.");
      if (ok) {
        setShowForm(false);
      }
      return;
    }

    const ok = await staff.perform(async () => {
      await api.createReservation(payload);
      setForm(DEFAULT_FORM);
    }, "Reservation created.");
    if (ok) {
      setShowForm(false);
    }
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
    setShowForm(true);
  }

  function resetForm() {
    setEditingReservationId(null);
    setForm(DEFAULT_FORM);
    setShowForm(false);
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

  async function updateReservationCell(event: CellValueChangedEvent<Reservation>) {
    const field = event.colDef.field as keyof Reservation | undefined;
    if (!field || event.oldValue === event.newValue || field === "reservation_id") {
      return;
    }

    const nextValue = field === "return_location_id" && !event.newValue
      ? null
      : event.newValue;

    await staff.perform(async () => {
      await api.updateReservation(event.data.reservation_id, { [field]: nextValue } as Partial<Omit<Reservation, "reservation_id">>);
    }, "Reservation updated.");
  }

  const reservationColumns = useMemo<ColDef<Reservation>[]>(() => {
    const customerIds = staff.customers.map((customer) => customer.customer_id);
    const locationIds = staff.locations.map((location) => location.location_id);
    const returnLocationIds = ["", ...locationIds];
    const classIds = staff.carClasses.map((carClass) => carClass.class_id);
    const customerName = (customerId: string | null | undefined) => {
      const customer = customerId ? staff.customerById[customerId] : undefined;
      return customer ? `${customer.first_name} ${customer.last_name}` : customerId || "-";
    };
    const locationName = (locationId: string | null | undefined) => {
      const location = locationId ? staff.locationById[locationId] : undefined;
      return location ? `${location.city}, ${location.state}` : locationId || "Pickup location";
    };
    const className = (classId: string | null | undefined) => staff.classById[classId || ""]?.class_name || classId || "-";

    return [
      { field: "reservation_id", headerName: "Reservation", minWidth: 180 },
      {
        field: "reservation_status",
        headerName: "Status",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: STATUS_OPTIONS },
        minWidth: 145,
      },
      {
        field: "customer_id",
        headerName: "Customer",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: customerIds },
        valueFormatter: (params) => customerName(String(params.value || "")),
        minWidth: 190,
      },
      {
        field: "location_id",
        headerName: "Pickup Location",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: locationIds },
        valueFormatter: (params) => locationName(String(params.value || "")),
        minWidth: 190,
      },
      {
        field: "return_location_id",
        headerName: "Return Location",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: returnLocationIds },
        valueFormatter: (params) => locationName(params.value ? String(params.value) : null),
        minWidth: 190,
      },
      {
        field: "class_id",
        headerName: "Class",
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: { values: classIds },
        valueFormatter: (params) => className(String(params.value || "")),
        minWidth: 170,
      },
      { field: "pickup_date_time", headerName: "Pickup", valueFormatter: (params) => formatDateTime(String(params.value || "")), minWidth: 190 },
      { field: "return_date_time_requested", headerName: "Return", valueFormatter: (params) => formatDateTime(String(params.value || "")), minWidth: 190 },
      {
        headerName: "Actions",
        editable: false,
        filter: false,
        sortable: false,
        pinned: "right",
        width: 265,
        cellRenderer: (params: ICellRendererParams<Reservation>) => (
          <div className="grid-action-group">
            <button type="button" className="grid-action-button" onClick={() => params.data && startEdit(params.data.reservation_id)}>Edit</button>
            <button type="button" className="grid-action-button" onClick={() => params.data && void updateStatus(params.data.reservation_id, "CANCELED")}>Cancel</button>
            <button type="button" className="grid-action-button" onClick={() => params.data && void updateStatus(params.data.reservation_id, "NO_SHOW")}>No-show</button>
            <button type="button" className="grid-action-button danger" onClick={() => params.data && void removeReservation(params.data.reservation_id)}>Delete</button>
          </div>
        ),
      },
    ];
  }, [staff]);

  return (
    <>
      <SectionCard title="Admin Reservation Management" subtitle="Create, edit, update status, and delete reservation records.">
        <div className="action-strip">
          <button type="button" onClick={() => { setEditingReservationId(null); setForm(DEFAULT_FORM); setShowForm((value) => !value); }}>
            {showForm && !editingReservationId ? "Hide Create Reservation" : "Create Reservation"}
          </button>
          <button type="button" className="ghost-button" onClick={() => void staff.refresh()}>Refresh List</button>
        </div>
        {showForm ? (
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
              <button type="button" className="ghost-button" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        ) : null}
      </SectionCard>

      <SectionCard title="Reservation List" subtitle="Inline edit status, customer, locations, and class. Use Edit when date/time changes are required.">
        <div className="stack-form">
          <input placeholder="Search reservations" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <AdminDataGrid
          rows={filteredReservations}
          columns={reservationColumns}
          getRowId={(reservation) => reservation.reservation_id}
          emptyText="No reservations match this filter."
          height={500}
          onCellValueChanged={updateReservationCell}
        />
      </SectionCard>
    </>
  );
}
