import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { usePathname } from "./lib/router";
import { LoginPage } from "./pages/LoginPage";
import { CustomerPortal } from "./pages/customer/CustomerPortal";
import { AgentWorkspace } from "./pages/agent/AgentWorkspace";
import { ManagerDashboard } from "./pages/manager/ManagerDashboard";
import { AdminConsole } from "./pages/admin/AdminConsole";

function RoutedApp() {
  const pathname = usePathname();
  const { session } = useAuth();

  if (pathname === "/") {
    return <LoginPage />;
  }

  if (!session) {
    return <LoginPage />;
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

  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <RoutedApp />
    </AuthProvider>
  );
}
