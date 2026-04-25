import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { usePathname } from "./lib/router";
import { LandingPage } from "./pages/LandingPage";
import { CustomerPortal } from "./pages/customer/CustomerPortal";
import { AgentWorkspace } from "./pages/agent/AgentWorkspace";
import { ManagerDashboard } from "./pages/manager/ManagerDashboard";
import { AdminConsole } from "./pages/admin/AdminConsole";

function RoutedApp() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (pathname === "/") {
    return <LandingPage />;
  }

  if (!session) {
    return <LandingPage />;
  }

  if (pathname === "/customer") {
    return (
      <ProtectedRoute allowedRole="customer">
        <CustomerPortal />
      </ProtectedRoute>
    );
  }

  if (pathname === "/agent") {
    return (
      <ProtectedRoute allowedRole="agent">
        <AgentWorkspace />
      </ProtectedRoute>
    );
  }

  if (pathname === "/manager") {
    return (
      <ProtectedRoute allowedRole="manager">
        <ManagerDashboard />
      </ProtectedRoute>
    );
  }

  if (pathname === "/admin") {
    return (
      <ProtectedRoute allowedRole="admin">
        <AdminConsole />
      </ProtectedRoute>
    );
  }

  return <LandingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RoutedApp />
    </AuthProvider>
  );
}
