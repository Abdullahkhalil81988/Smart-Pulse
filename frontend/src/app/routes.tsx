import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { GuestRoute } from "./components/GuestRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { POSPage } from "./pages/POSPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { SalesPage } from "./pages/SalesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SentimentAnalysisPage } from "./pages/SentimentAnalysisPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { InventoryPage } from "./pages/InventoryPage";

export const router = createBrowserRouter([
  // Guest-only routes — logged-in users get redirected to /dashboard
  {
    element: <GuestRoute />,
    children: [
      { path: "/login", Component: LoginPage },
      { path: "/register", Component: RegisterPage },
      { path: "/forgot-password", Component: ForgotPasswordPage },
    ],
  },

  // Protected routes — unauthenticated users get redirected to /login
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        Component: Layout,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", Component: DashboardPage },
          { path: "pos", Component: POSPage },
          { path: "transactions", Component: TransactionsPage },
          { path: "sales", Component: SalesPage },
          { path: "customers", Component: CustomersPage },
          { path: "sentiment-analysis", Component: SentimentAnalysisPage },
          { path: "inventory", Component: InventoryPage },
          { path: "analytics", Component: AnalyticsPage },
          { path: "settings", Component: SettingsPage },
        ],
      },
    ],
  },

  // Catch-all — redirect to root (auth guards will decide login vs dashboard)
  { path: "*", element: <Navigate to="/" replace /> },
]);