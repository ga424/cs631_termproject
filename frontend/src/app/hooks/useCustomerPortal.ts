import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CustomerPortalBookingRequest, CustomerPortalCatalog, CustomerPortalSummary } from "../lib/types";

const EMPTY_CATALOG: CustomerPortalCatalog = {
  locations: [],
  car_classes: [],
  workflow: [],
};

export function useCustomerPortal() {
  const [catalog, setCatalog] = useState<CustomerPortalCatalog>(EMPTY_CATALOG);
  const [summary, setSummary] = useState<CustomerPortalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catalogResponse, summaryResponse] = await Promise.all([
        api.getCustomerPortalCatalog(),
        api.getMyCustomerPortalSummary(),
      ]);
      setCatalog(catalogResponse);
      setSummary(summaryResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer portal data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBooking = useCallback(async (payload: CustomerPortalBookingRequest) => {
    const response = await api.createCustomerBooking(payload);
    setSuccess(`Reservation booked for ${response.reservation.reservation_id.slice(0, 8)}.`);
    setError("");
    await refresh();
    return response;
  }, [refresh]);

  return {
    catalog,
    summary,
    loading,
    error,
    success,
    setError,
    setSuccess,
    createBooking,
    refresh,
  };
}
