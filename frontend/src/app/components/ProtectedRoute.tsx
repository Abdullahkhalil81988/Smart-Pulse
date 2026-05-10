import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { Loader2 } from "lucide-react";

const roleAccess: Record<string, string[]> = {
  Admin: ["/dashboard", "/pos", "/transactions", "/sales", "/customers", "/sentiment-analysis", "/inventory", "/analytics", "/settings"],
  Manager: ["/dashboard", "/pos", "/transactions", "/sales", "/customers", "/sentiment-analysis", "/inventory", "/analytics"],
  Analyst: ["/dashboard", "/sales", "/sentiment-analysis", "/analytics"],
  Cashier: ["/pos", "/transactions"],
};

/**
 * Wraps internal routes that require authentication.
 * - While auth state is loading, shows a full-screen spinner.
 * - If not authenticated, redirects to /login.
 * - Otherwise renders the child routes.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (user) {
    const userRole = user.role || "Cashier";
    const allowedRoutes = roleAccess[userRole] || roleAccess["Cashier"];
    const hasAccess = allowedRoutes.some(route => location.pathname.startsWith(route));
    if (!hasAccess && location.pathname !== "/") {
       return <Navigate to={allowedRoutes[0]} replace />;
    }
  }

  return <Outlet />;
}
