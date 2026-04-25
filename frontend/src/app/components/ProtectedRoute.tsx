import { useEffect } from "react";
import { navigateTo, type AppPath } from "../lib/router";
import { useAuth } from "../contexts/AuthContext";
import type { Role } from "../lib/types";

export function ProtectedRoute({
  allowedRole,
  fallbackPath = "/",
  children,
}: {
  allowedRole: Role;
  fallbackPath?: AppPath;
  children: React.ReactNode;
}) {
  const { session } = useAuth();

  useEffect(() => {
    if (!session || session.role !== allowedRole) {
      navigateTo(fallbackPath);
    }
  }, [allowedRole, fallbackPath, session]);

  if (!session || session.role !== allowedRole) {
    return null;
  }

  return <>{children}</>;
}
