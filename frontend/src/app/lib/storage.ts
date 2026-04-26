export const AUTH_STORAGE_KEY = "rentacar_staff_auth";
export const CUSTOMER_STORAGE_KEY = "rentacar_customer_portal_id";

export type AuthSession = {
  access_token: string;
  token_type: string;
  username: string;
  role: "customer" | "agent" | "manager" | "admin";
  customer_id?: string | null;
  account_id?: string | null;
};

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredCustomerPortalId(): string {
  return window.localStorage.getItem(CUSTOMER_STORAGE_KEY) || "";
}

export function setStoredCustomerPortalId(customerId: string) {
  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, customerId);
}

export function clearStoredCustomerPortalId() {
  window.localStorage.removeItem(CUSTOMER_STORAGE_KEY);
}
