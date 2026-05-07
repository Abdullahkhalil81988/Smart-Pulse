import { Navigate, Outlet } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Wraps guest-only routes (/login, /register, /forgot-password).
 * - While auth state is loading, shows a full-screen spinner.
 * - If the user is already logged in, redirects to /dashboard.
 * - Otherwise renders the child routes (login/register forms).
 */
export function GuestRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
