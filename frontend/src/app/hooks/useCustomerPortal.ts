import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { getStoredCustomerPortalId, setStoredCustomerPortalId } from "../lib/storage";
import type { CustomerPortalBookingRequest, CustomerPortalCatalog, CustomerPortalSummary } from "../lib/types";

const EMPTY_CATALOG: CustomerPortalCatalog = {
  locations: [],
  car_classes: [],
  workflow: [],
};

export function useCustomerPortal() {
  const [catalog, setCatalog] = useState<CustomerPortalCatalog>(EMPTY_CATALOG);
  const [summary, setSummary] = useState<CustomerPortalSummary | null>(null);
  const [customerPortalId, setCustomerPortalId] = useState<string>(() => getStoredCustomerPortalId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refresh = useCallback(async (portalId?: string) => {
    setLoading(true);
    setError("");
    try {
      const catalogResponse = await api.getCustomerPortalCatalog();
      setCatalog(catalogResponse);
      const currentPortalId = portalId ?? customerPortalId;
      if (currentPortalId) {
        const summaryResponse = await api.getCustomerPortalSummary(currentPortalId);
        setSummary(summaryResponse);
      } else {
        setSummary(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer portal data.");
    } finally {
      setLoading(false);
    }
  }, [customerPortalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBooking = useCallback(async (payload: CustomerPortalBookingRequest) => {
    const response = await api.createCustomerBooking(payload);
    setStoredCustomerPortalId(response.customer_id);
    setCustomerPortalId(response.customer_id);
    setSuccess(`Reservation booked for ${response.reservation.reservation_id.slice(0, 8)}.`);
    setError("");
    await refresh(response.customer_id);
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
    customerPortalId,
    createBooking,
    refresh,
  };
}
