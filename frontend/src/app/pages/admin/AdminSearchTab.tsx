import { useMemo, useState } from "react";
import { QueueList, SectionCard } from "../../components/ui";
import type { StaffData } from "../../hooks/useStaffData";
import type { CustomerAccountAdmin } from "../../lib/types";

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

  return (
    <>
      <SectionCard title="Global Search" subtitle="Search users, reservations, vehicles, and locations from one admin workspace.">
        <div className="stack-form">
          <input placeholder="Search all entities" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </SectionCard>

      <SectionCard title="User Results" subtitle={`${userMatches.length} match(es)`}>
        <QueueList
          title="Users"
          items={userMatches.map((account) => {
            const customer = staff.customerById[account.customer_id];
            return {
              id: account.account_id,
              title: `${account.username} (${account.is_active ? "active" : "inactive"})`,
              subtitle: `${customer ? `${customer.first_name} ${customer.last_name}` : `${account.first_name} ${account.last_name}`} · ${account.city}, ${account.state}`,
              meta: customer?.license_number || "License pending",
            };
          })}
          emptyText="No users found."
        />
      </SectionCard>

      <SectionCard title="Reservation Results" subtitle={`${reservationMatches.length} match(es)`}>
        <QueueList
          title="Reservations"
          items={reservationMatches.map((reservation) => {
            const customer = staff.customerById[reservation.customer_id];
            const location = staff.locationById[reservation.location_id];
            return {
              id: reservation.reservation_id,
              title: `${reservation.reservation_status} · ${reservation.reservation_id.slice(0, 8)}`,
              subtitle: `${customer ? `${customer.first_name} ${customer.last_name}` : reservation.customer_id} · ${location ? `${location.city}, ${location.state}` : "Unknown location"}`,
              meta: reservation.pickup_date_time,
            };
          })}
          emptyText="No reservations found."
        />
      </SectionCard>

      <SectionCard title="Vehicle Results" subtitle={`${vehicleMatches.length} match(es)`}>
        <QueueList
          title="Vehicles"
          items={vehicleMatches.map((car) => {
            const location = staff.locationById[car.location_id];
            return {
              id: car.vin,
              title: `${car.model_name} · ${car.vin}`,
              subtitle: location ? `${location.city}, ${location.state}` : "Unknown branch",
              meta: `${car.current_odometer_reading.toLocaleString()} mi`,
            };
          })}
          emptyText="No vehicles found."
        />
      </SectionCard>

      <SectionCard title="Location Results" subtitle={`${locationMatches.length} match(es)`}>
        <QueueList
          title="Locations"
          items={locationMatches.map((location) => ({
            id: location.location_id,
            title: `${location.city}, ${location.state}`,
            subtitle: location.street,
            meta: location.zip,
          }))}
          emptyText="No locations found."
        />
      </SectionCard>
    </>
  );
}
