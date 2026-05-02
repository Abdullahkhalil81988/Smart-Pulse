import { AlertTriangle, Activity, Upload } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";

const kpis = [
  { label: "Revenue today", value: "$12,480", delta: "+8.2%", up: true, color: "border-l-emerald-400" },
  { label: "Fraud flagged", value: "7", delta: "−2 vs yesterday", up: false, color: "border-l-amber-400" },
  { label: "Churn alerts", value: "23", delta: "+5 new", up: false, color: "border-l-pink-400" },
];

const activityItems = [
  { time: "2 min ago", label: "Transaction #4821 flagged — fraud score 87", badge: "FRAUD", badgeColor: "bg-red-100 text-red-600" },
  { time: "5 min ago", label: "Invoice #INV-0094 paid — $1,200", badge: "PAID", badgeColor: "bg-emerald-100 text-emerald-700" },
  { time: "12 min ago", label: "Customer Maria S. marked at-risk", badge: "CHURN", badgeColor: "bg-pink-100 text-pink-700" },
  { time: "18 min ago", label: "Transaction #4820 completed — $340", badge: "OK", badgeColor: "bg-gray-100 text-gray-500" },
  { time: "34 min ago", label: "New customer registered — Dave P.", badge: "NEW", badgeColor: "bg-blue-100 text-blue-600" },
  { time: "1 hr ago", label: "Transaction #4819 flagged — fraud score 91", badge: "FRAUD", badgeColor: "bg-red-100 text-red-600" },
];

const alerts = [
  { label: "High fraud rate — Terminal 3", sev: "CRITICAL", color: "bg-red-50 border-red-200 text-red-700" },
  { label: "Revenue dip — last 2 hrs", sev: "WARNING", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { label: "23 at-risk customers", sev: "WARNING", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { label: "Model drift detected", sev: "INFO", color: "bg-blue-50 border-blue-200 text-blue-700" },
];

export function DashboardPage() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Page header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Dashboard</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Overview — today, Apr 4 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-2 text-sm text-gray-600">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Live
          </div>
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center text-sm text-gray-600">Today ▾</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${k.color} p-4`}>
            <p className="text-gray-500 text-xs">{k.label}</p>
            <p className="text-gray-900 mt-1 mb-2" style={{ fontSize: 22, fontWeight: 700 }}>{k.value}</p>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs ${
                k.up
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
              style={{ fontWeight: 600 }}
            >
              {k.delta}
            </span>
          </div>
        ))}
      </div>

      {/* 70/30 Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* LEFT COLUMN - 70% */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Row: Two Cards Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Card: Revenue Goal Pacing */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Revenue Goal Pacing</h3>

              {/* Large Number */}
              <div className="text-center mb-5">
                <p className="text-gray-900" style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>$182,400</p>
                <p className="text-gray-500 text-xs mt-1">Monthly Forecast</p>
              </div>

              {/* Thick Progress Bar */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Progress</span>
                  <span style={{ fontWeight: 600 }}>40%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-3 bg-emerald-500 rounded-full" style={{ width: "40%" }} />
                </div>
              </div>

              {/* CSV Upload Drop Zone */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer">
                <Upload size={20} className="text-gray-400 mx-auto mb-1.5" />
                <p className="text-gray-700 text-xs" style={{ fontWeight: 600 }}>Drop monthly retail CSV here</p>
              </div>
            </div>

            {/* Right Card: Revenue Trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Revenue trend</h3>
                  <p className="text-gray-400 text-xs mt-0.5">30-day forecast</p>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-emerald-500" />Actual
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-gray-300 border-dashed border-t-2" />Forecast
                  </span>
                </div>
              </div>
              <WireframeBox label="Line chart — Revenue vs Forecast" note="X: days  Y: $ revenue" height={200} />
            </div>
          </div>

          {/* Activity Feed - Full Width Below Both Cards */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Activity feed</p>
              <span className="text-xs text-violet-600 cursor-pointer hover:underline">View all</span>
            </div>
            <div className="space-y-2">
              {activityItems.map((item, i) => (
                <div key={i} className="flex items-start md:items-center gap-3 py-2 md:py-1.5 border-b border-gray-50 last:border-0">
                  <Activity size={13} className="text-gray-300 flex-shrink-0 mt-0.5 md:mt-0" />

                  {/* Mobile: Vertical Layout */}
                  <div className="flex-1 flex flex-col md:hidden gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-gray-700 text-xs flex-1">{item.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${item.badgeColor} flex-shrink-0`} style={{ fontWeight: 600 }}>
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-gray-500 text-xs">{item.time}</span>
                  </div>

                  {/* Desktop: Horizontal Layout */}
                  <span className="hidden md:inline-block text-gray-500 text-xs flex-shrink-0 w-16">{item.time}</span>
                  <span className="hidden md:inline-block text-gray-700 text-xs flex-1">{item.label}</span>
                  <span className={`hidden md:inline-flex text-xs px-1.5 py-0.5 rounded ${item.badgeColor} flex-shrink-0`} style={{ fontWeight: 600 }}>
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - 30% Sticky Alerts Sidebar */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500" />
                <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Active alerts</p>
              </div>
              <div className="space-y-2.5">
                {alerts.map((a, i) => (
                  <div key={i} className={`rounded-md border p-3 ${a.color}`}>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/60 inline-block mb-1.5" style={{ fontWeight: 700 }}>
                      {a.sev}
                    </span>
                    <p className="text-xs" style={{ fontWeight: 600 }}>{a.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
