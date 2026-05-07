import { useEffect, useState } from "react";
import { AlertTriangle, Activity, Upload, Loader2, Inbox } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";
import api from "../lib/api";

/* ─── types ──────────────────────────────────────────────── */

interface PredictionStats {
  total: number;
  anomalies: number;
  accuracy: number | null;
  active_models: number;
}

interface AlertItem {
  _id: string;
  type: string;
  severity: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface PredictionItem {
  _id: string;
  model_name: string;
  model_type: string;
  prediction: number;
  confidence: number;
  anomaly_flag: boolean;
  createdAt: string;
}

/* ─── helpers ────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function severityStyle(sev: string) {
  switch (sev) {
    case "high":
      return "bg-red-50 border-red-200 text-red-700";
    case "medium":
      return "bg-amber-50 border-amber-200 text-amber-700";
    default:
      return "bg-blue-50 border-blue-200 text-blue-700";
  }
}

function badgeForPrediction(p: PredictionItem) {
  if (p.anomaly_flag) return { text: "ANOMALY", color: "bg-red-100 text-red-600" };
  if (p.model_type === "forecaster") return { text: "FORECAST", color: "bg-blue-100 text-blue-600" };
  return { text: "OK", color: "bg-emerald-100 text-emerald-700" };
}

/* ─── component ──────────────────────────────────────────── */

export function DashboardPage() {
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, alertsRes, predsRes] = await Promise.all([
          api.get<PredictionStats>("/api/predictions/stats"),
          api.get<AlertItem[]>("/api/alerts?limit=5"),
          api.get<{ predictions: PredictionItem[] }>("/api/predictions?limit=6"),
        ]);
        setStats(statsRes);
        setAlerts(alertsRes);
        setPredictions(predsRes.predictions);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  /* ─── KPI data ─────────────────────────────────────────── */
  const kpis = [
    {
      label: "Total predictions",
      value: stats?.total?.toLocaleString() ?? "0",
      delta: `${stats?.active_models ?? 0} active model${(stats?.active_models ?? 0) !== 1 ? "s" : ""}`,
      up: true,
      color: "border-l-emerald-400",
    },
    {
      label: "Anomalies detected",
      value: String(stats?.anomalies ?? 0),
      delta: stats?.anomalies ? "requires review" : "none detected",
      up: !stats?.anomalies,
      color: "border-l-amber-400",
    },
    {
      label: "Model accuracy",
      value: stats?.accuracy != null ? `${stats.accuracy}%` : "N/A",
      delta: stats?.accuracy != null ? "based on feedback" : "no feedback yet",
      up: (stats?.accuracy ?? 0) >= 80,
      color: "border-l-pink-400",
    },
  ];

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Page header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Dashboard</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Overview — {today}</p>
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
                <p className="text-gray-400 text-xs">Upload retail CSV to populate</p>
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

            {predictions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Inbox size={28} className="mb-2" />
                <p className="text-sm" style={{ fontWeight: 500 }}>No activity yet</p>
                <p className="text-xs mt-0.5">Predictions will appear here as they are created</p>
              </div>
            ) : (
              <div className="space-y-2">
                {predictions.map((p) => {
                  const badge = badgeForPrediction(p);
                  const label = `${p.model_name} — prediction: ${p.prediction.toFixed(2)} (confidence: ${(p.confidence * 100).toFixed(0)}%)`;
                  const time = timeAgo(p.createdAt);
                  return (
                    <div key={p._id} className="flex items-start md:items-center gap-3 py-2 md:py-1.5 border-b border-gray-50 last:border-0">
                      <Activity size={13} className="text-gray-300 flex-shrink-0 mt-0.5 md:mt-0" />

                      {/* Mobile: Vertical Layout */}
                      <div className="flex-1 flex flex-col md:hidden gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-gray-700 text-xs flex-1">{label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${badge.color} flex-shrink-0`} style={{ fontWeight: 600 }}>
                            {badge.text}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">{time}</span>
                      </div>

                      {/* Desktop: Horizontal Layout */}
                      <span className="hidden md:inline-block text-gray-500 text-xs flex-shrink-0 w-16">{time}</span>
                      <span className="hidden md:inline-block text-gray-700 text-xs flex-1">{label}</span>
                      <span className={`hidden md:inline-flex text-xs px-1.5 py-0.5 rounded ${badge.color} flex-shrink-0`} style={{ fontWeight: 600 }}>
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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

              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                  <Inbox size={24} className="mb-2" />
                  <p className="text-xs" style={{ fontWeight: 500 }}>No alerts</p>
                  <p className="text-xs mt-0.5">All clear!</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {alerts.map((a) => (
                    <div key={a._id} className={`rounded-md border p-3 ${severityStyle(a.severity)}`}>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/60 inline-block mb-1.5" style={{ fontWeight: 700 }}>
                        {a.severity.toUpperCase()}
                      </span>
                      <p className="text-xs" style={{ fontWeight: 600 }}>{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
