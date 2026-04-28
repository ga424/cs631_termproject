import { useCallback, useEffect, useMemo, useState } from "react";
import { api, formatPercent } from "../lib/api";
import type { Car, CarClass, Customer, DashboardOverview, Location, Model, Reservation, RentalAgreement } from "../lib/types";

export function useStaffData() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [carClasses, setCarClasses] = useState<CarClass[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rentalAgreements, setRentalAgreements] = useState<RentalAgreement[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        customerData,
        locationData,
        classData,
        modelData,
        carData,
        reservationData,
        rentalData,
        dashboardData,
      ] = await Promise.all([
        api.listCustomers(),
        api.listLocations(),
        api.listCarClasses(),
        api.listModels(),
        api.listCars(),
        api.listReservations(),
        api.listRentalAgreements(),
        api.getDashboardOverview(),
      ]);

      setCustomers(customerData);
      setLocations(locationData);
      setCarClasses(classData);
      setModels(modelData);
      setCars(carData);
      setReservations(reservationData);
      setRentalAgreements(rentalData);
      setDashboard(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load staff data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const customerById = useMemo(() => Object.fromEntries(customers.map((item) => [item.customer_id, item])), [customers]);
  const locationById = useMemo(() => Object.fromEntries(locations.map((item) => [item.location_id, item])), [locations]);
  const classById = useMemo(() => Object.fromEntries(carClasses.map((item) => [item.class_id, item])), [carClasses]);
  const reservationById = useMemo(() => Object.fromEntries(reservations.map((item) => [item.reservation_id, item])), [reservations]);
  const modelByName = useMemo(() => Object.fromEntries(models.map((item) => [item.model_name, item])), [models]);

  const activeReservations = useMemo(() => reservations.filter((item) => item.reservation_status === "ACTIVE"), [reservations]);
  const openRentals = useMemo(() => rentalAgreements.filter((item) => !item.rental_end_date_time), [rentalAgreements]);
  const rentalReservationSet = useMemo(() => new Set(rentalAgreements.map((item) => item.reservation_id)), [rentalAgreements]);
  const unassignedActiveReservations = useMemo(
    () => activeReservations.filter((item) => !rentalReservationSet.has(item.reservation_id)),
    [activeReservations, rentalReservationSet],
  );
  const openRentalVinSet = useMemo(() => new Set(openRentals.map((item) => item.vin)), [openRentals]);
  const stats = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    const utilization = dashboard.totals.total_cars > 0
      ? (dashboard.totals.rented_cars / dashboard.totals.total_cars) * 100
      : 0;

    return [
      { label: "Fleet", value: dashboard.totals.total_cars },
      { label: "Available", value: dashboard.totals.available_cars },
      { label: "Rented", value: dashboard.totals.rented_cars },
      { label: "Reserved", value: dashboard.totals.reserved_requests },
      { label: "Utilization", value: formatPercent(utilization) },
    ];
  }, [dashboard]);

  const managerAlerts = useMemo(() => {
    if (!dashboard) {
      return [];
    }
    return [
      ...dashboard.active_rentals.filter((item) => item.is_overdue).map((item) => ({
        id: item.contract_no,
        title: `Overdue return ${item.vin}`,
        subtitle: item.location_name,
        meta: `Due ${new Date(item.return_date_time_requested).toLocaleString()}`,
      })),
      ...dashboard.upcoming_pickups.map((item) => ({
        id: item.reservation_id,
        title: `Pickup due at ${item.location_name}`,
        subtitle: new Date(item.pickup_date_time).toLocaleString(),
        meta: item.reservation_status,
      })),
    ];
  }, [dashboard]);

  async function perform(operation: () => Promise<unknown>, message: string) {
    try {
      await operation();
      setSuccess(message);
      setError("");
      await refresh();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Operation failed.";
      await refresh();
      setSuccess("");
      setError(errorMessage);
      return false;
    }
  }

  return {
    customers,
    locations,
    carClasses,
    models,
    cars,
    reservations,
    rentalAgreements,
    dashboard,
    loading,
    error,
    success,
    setError,
    setSuccess,
    customerById,
    locationById,
    classById,
    reservationById,
    modelByName,
    activeReservations,
    unassignedActiveReservations,
    openRentals,
    openRentalVinSet,
    stats,
    managerAlerts,
    refresh,
    perform,
  };
}

export type StaffData = ReturnType<typeof useStaffData>;
