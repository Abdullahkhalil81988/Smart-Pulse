import { useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../lib/AuthContext";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart2,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Zap,
  Package,
  Menu,
  X,
} from "lucide-react";
import { useIsMobile } from "./ui/use-mobile";
import { Toaster } from "./ui/sonner";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-emerald-400" },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart, color: "text-orange-400" },
  { to: "/transactions", label: "Transactions", icon: Receipt, color: "text-amber-400" },
  { to: "/sales", label: "Sales", icon: TrendingUp, color: "text-blue-400" },
  { to: "/customers", label: "Customers", icon: Users, color: "text-pink-400" },
  { to: "/sentiment-analysis", label: "Sentiment Analysis", icon: MessageSquare, color: "text-purple-400" },
];

const backOfficeItems = [
  { to: "/inventory", label: "Inventory", icon: Package, color: "text-orange-300" },
  { to: "/analytics", label: "Analytics", icon: BarChart2, color: "text-violet-400" },
  { to: "/settings", label: "Settings", icon: Settings, color: "text-gray-400" },
];

const roleAccess: Record<string, string[]> = {
  Admin: ["/dashboard", "/pos", "/transactions", "/sales", "/customers", "/sentiment-analysis", "/inventory", "/analytics", "/settings"],
  Manager: ["/dashboard", "/pos", "/transactions", "/sales", "/customers", "/sentiment-analysis", "/inventory", "/analytics"],
  Analyst: ["/dashboard", "/sales", "/sentiment-analysis", "/analytics"],
  Cashier: ["/pos", "/transactions"],
};

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const displayName = user?.name || "User";
  const userRole = user?.role || "Cashier";

  const allowedRoutes = roleAccess[userRole] || roleAccess["Cashier"];

  const filteredNavItems = navItems.filter((i) => allowedRoutes.includes(i.to));
  const filteredBackOfficeItems = backOfficeItems.filter((i) => allowedRoutes.includes(i.to));

  const allItems = [...filteredNavItems, ...filteredBackOfficeItems];
  const currentItem = allItems.find((i) => location.pathname.startsWith(i.to));
  const pageLabel = currentItem?.label ?? "Overview";

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-700">
        <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="text-white text-sm" style={{ fontWeight: 600 }}>SmartPulse</span>
        <span className="ml-auto text-gray-500 text-xs border border-gray-700 rounded px-1 py-0.5">v1</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {filteredNavItems.length > 0 && <p className="px-2 pb-1 text-gray-500 uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>Main</p>}
        <ul className="space-y-0.5 mb-4">
          {filteredNavItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-sm ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`
                }
              >
                <item.icon size={15} className={item.color} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {filteredBackOfficeItems.length > 0 && (
          <>
            <p className="px-2 pb-1 text-gray-500 uppercase" style={{ fontSize: 10, letterSpacing: 1 }}>Back Office</p>
            <ul className="space-y-0.5">
              {filteredBackOfficeItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors text-sm ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                  }`
                }
              >
                <item.icon size={15} className={item.color} />
                {item.label}
              </NavLink>
            </li>
          ))}
            </ul>
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-700">
        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-800 cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white" style={{ fontSize: 11 }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-300 text-xs truncate" style={{ fontWeight: 500 }}>{displayName}</p>
            <p className="text-gray-500" style={{ fontSize: 10 }}>{userRole}</p>
          </div>
          <LogOut size={13} className="text-gray-600 group-hover:text-gray-400" onClick={async () => { await logout(); navigate("/login"); }} />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Toaster richColors position="top-right" />
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-900 flex-col flex-shrink-0 border-r border-gray-700">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gray-900 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <header className="h-12 bg-white border-b border-gray-200 flex items-center px-3 md:px-5 gap-3 flex-shrink-0">
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-gray-100 md:hidden"
            >
              <Menu size={20} className="text-gray-600" />
            </button>
          )}

          <div className="flex items-center gap-1 text-gray-400 text-sm">
            <span className="hidden sm:inline">SmartPulse</span>
            <ChevronRight size={13} className="hidden sm:inline" />
            <span className="text-gray-700 truncate" style={{ fontWeight: 500 }}>{pageLabel}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button className="relative p-1.5 rounded-md hover:bg-gray-100">
              <Bell size={16} className="text-gray-500" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-600" style={{ fontSize: 11, fontWeight: 600 }}>{initials}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}