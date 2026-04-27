import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import { formatDateTime } from "../../lib/api";
import { AdminDataGrid } from "../../components/AdminDataGrid";
import { SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { Car, CustomerAccountAdmin, Location, Reservation } from "../../lib/types";

export function AdminSearchTab({
  staff,
  accounts,
}: {
  staff: StaffData;
  accounts: CustomerAccountAdmin[];
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const userMatches = useMemo(() => {
    if (!normalizedQuery) {
      return accounts;
    }
    return accounts.filter((account) => {
      const customer = staff.customerById[account.customer_id];
      const fullName = customer ? `${customer.first_name} ${customer.last_name}` : `${account.first_name} ${account.last_name}`;
      const searchable = [
        account.username,
        fullName,
        customer?.license_number || "",
        account.city,
        account.state,
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [accounts, normalizedQuery, staff.customerById]);

  const reservationMatches = useMemo(() => {
    if (!normalizedQuery) {
      return staff.reservations;
    }
    return staff.reservations.filter((reservation) => {
      const customer = staff.customerById[reservation.customer_id];
      const location = staff.locationById[reservation.location_id];
      const carClass = staff.classById[reservation.class_id];
      const searchable = [
        reservation.reservation_id,
        reservation.reservation_status,
        customer ? `${customer.first_name} ${customer.last_name}` : "",
        location ? `${location.city} ${location.state}` : "",
        carClass?.class_name || "",
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, staff.classById, staff.customerById, staff.locationById, staff.reservations]);

  const vehicleMatches = useMemo(() => {
    if (!normalizedQuery) {
      return staff.cars;
    }
    return staff.cars.filter((car) => {
      const location = staff.locationById[car.location_id];
      const model = staff.modelByName[car.model_name];
      const searchable = [
        car.vin,
        car.model_name,
        model?.make_name || "",
        location ? `${location.city} ${location.state}` : "",
      ].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, staff.cars, staff.locationById, staff.modelByName]);

  const locationMatches = useMemo(() => {
    if (!normalizedQuery) {
      return staff.locations;
    }
    return staff.locations.filter((location) => {
      const searchable = [location.street, location.city, location.state, location.zip].join(" ").toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, staff.locations]);

  const userColumns = useMemo<ColDef<CustomerAccountAdmin>[]>(() => ([
    { field: "username", headerName: "Username", minWidth: 170 },
    {
      field: "is_active",
      headerName: "Status",
      valueFormatter: (params) => params.value ? "Active" : "Inactive",
      minWidth: 120,
    },
    { field: "first_name", headerName: "First", minWidth: 140 },
    { field: "last_name", headerName: "Last", minWidth: 140 },
    { field: "city", headerName: "City", minWidth: 150 },
    { field: "state", headerName: "State", minWidth: 100 },
    { field: "last_login_at", headerName: "Last Login", valueFormatter: (params) => params.value ? formatDateTime(String(params.value)) : "Never", minWidth: 190 },
  ]), []);

  const reservationColumns = useMemo<ColDef<Reservation>[]>(() => {
    const customerName = (customerId: string) => {
      const customer = staff.customerById[customerId];
      return customer ? `${customer.first_name} ${customer.last_name}` : customerId;
    };
    const locationName = (locationId: string | null) => {
      const location = locationId ? staff.locationById[locationId] : undefined;
      return location ? `${location.city}, ${location.state}` : locationId || "-";
    };
    const className = (classId: string) => staff.classById[classId]?.class_name || classId;

    return [
      { field: "reservation_status", headerName: "Status", minWidth: 140 },
      { field: "customer_id", headerName: "Customer", valueFormatter: (params) => customerName(String(params.value || "")), minWidth: 190 },
      { field: "location_id", headerName: "Pickup", valueFormatter: (params) => locationName(String(params.value || "")), minWidth: 180 },
      { field: "return_location_id", headerName: "Return", valueFormatter: (params) => locationName(params.value ? String(params.value) : null), minWidth: 180 },
      { field: "class_id", headerName: "Class", valueFormatter: (params) => className(String(params.value || "")), minWidth: 160 },
      { field: "pickup_date_time", headerName: "Pickup Time", valueFormatter: (params) => formatDateTime(String(params.value || "")), minWidth: 190 },
      { field: "return_date_time_requested", headerName: "Return Time", valueFormatter: (params) => formatDateTime(String(params.value || "")), minWidth: 190 },
      { field: "reservation_id", headerName: "Reservation ID", minWidth: 260 },
    ];
  }, [staff.classById, staff.customerById, staff.locationById]);

  const vehicleColumns = useMemo<ColDef<Car>[]>(() => {
    const locationName = (locationId: string) => {
      const location = staff.locationById[locationId];
      return location ? `${location.city}, ${location.state}` : locationId;
    };
    const modelName = (name: string) => {
      const model = staff.modelByName[name];
      const carClass = model ? staff.classById[model.class_id] : undefined;
      return model ? `${model.make_name} ${model.model_name} (${carClass?.class_name || "Unclassified"})` : name;
    };

    return [
      { field: "vin", headerName: "VIN", minWidth: 190 },
      { field: "model_name", headerName: "Model / Class", valueFormatter: (params) => modelName(String(params.value || "")), minWidth: 270 },
      { field: "location_id", headerName: "Location", valueFormatter: (params) => locationName(String(params.value || "")), minWidth: 180 },
      { field: "current_odometer_reading", headerName: "Odometer", valueFormatter: (params) => `${Number(params.value || 0).toLocaleString()} mi`, minWidth: 140, filter: "agNumberColumnFilter" },
    ];
  }, [staff.classById, staff.locationById, staff.modelByName]);

  const locationColumns = useMemo<ColDef<Location>[]>(() => ([
    { field: "city", headerName: "City", minWidth: 160 },
    { field: "state", headerName: "State", minWidth: 100 },
    { field: "street", headerName: "Street", minWidth: 230 },
    { field: "zip", headerName: "ZIP", minWidth: 120 },
    { field: "location_id", headerName: "Location ID", minWidth: 260 },
  ]), []);

  return (
    <>
      <SectionCard title="Global Search" subtitle="Search users, reservations, vehicles, and locations from one admin workspace.">
        <div className="stack-form">
          <input placeholder="Search all entities" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="Customer Results" subtitle={`${userMatches.length} match(es)`}>
        <AdminDataGrid
          rows={userMatches}
          columns={userColumns}
          getRowId={(account) => account.account_id}
          emptyText="No users found."
          height={360}
        />
      </SectionCard>

      <SectionCard title="Reservation Results" subtitle={`${reservationMatches.length} match(es)`}>
        <AdminDataGrid
          rows={reservationMatches}
          columns={reservationColumns}
          getRowId={(reservation) => reservation.reservation_id}
          emptyText="No reservations found."
          height={400}
        />
      </SectionCard>

      <SectionCard title="Vehicle Results" subtitle={`${vehicleMatches.length} match(es)`}>
        <AdminDataGrid
          rows={vehicleMatches}
          columns={vehicleColumns}
          getRowId={(car) => car.vin}
          emptyText="No vehicles found."
          height={360}
        />
      </SectionCard>

      <SectionCard title="Location Results" subtitle={`${locationMatches.length} match(es)`}>
        <AdminDataGrid
          rows={locationMatches}
          columns={locationColumns}
          getRowId={(location) => location.location_id}
          emptyText="No locations found."
          height={340}
        />
      </SectionCard>
    </>
  );
}
