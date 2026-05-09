import { Navigate, Outlet } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Wraps internal routes that require authentication.
 * - While auth state is loading, shows a full-screen spinner.
 * - If not authenticated, redirects to /login.
 * - Otherwise renders the child routes.
 */
export function ProtectedRoute() {
  const { user, loading } = useAuth();

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

  return <Outlet />;
}
