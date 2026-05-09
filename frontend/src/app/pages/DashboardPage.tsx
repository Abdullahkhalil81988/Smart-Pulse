import { useEffect, useState, useCallback, useRef } from "react";
import { AlertTriangle, Activity, Upload, Loader2, Inbox, Users, ShieldAlert, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../lib/api";
import { parseCsvText } from "../lib/csv";

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

interface MLPredictionResult {
  prediction: number;
  confidence: number;
  model_name: string;
  historical_data?: { date: string; actual: number }[];
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

  // Forecaster states
  const [forecastData, setForecastData] = useState<MLPredictionResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [churnResult, setChurnResult] = useState<{ prediction: number; confidence: number; model_name: string; cluster_label?: number | null } | null>(null);
  const [churnUploading, setChurnUploading] = useState(false);
  const [churnError, setChurnError] = useState<string | null>(null);
  const churnRef = useRef<HTMLInputElement>(null);

  const [fraudResult, setFraudResult] = useState<{ prediction: number; confidence: number; model_name: string; anomaly_flag: boolean } | null>(null);
  const [fraudUploading, setFraudUploading] = useState(false);
  const [fraudError, setFraudError] = useState<string | null>(null);
  const fraudRef = useRef<HTMLInputElement>(null);

  const fetchDashboard = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      const csvText = await file.text();
      const parsed = parseCsvText(csvText);
      const headerSet = new Set(parsed.headers.map((header) => header.toLowerCase()));

      const hasInvoiceDate = headerSet.has("invoicedate");
      const hasQuantity = headerSet.has("quantity");
      const hasUnitPrice = headerSet.has("unitprice") || headerSet.has("price");

      if (!hasInvoiceDate || !hasQuantity || !hasUnitPrice) {
        throw new Error("CSV must include InvoiceDate, Quantity, and UnitPrice columns.");
      }

      if (parsed.rows.length < 10) {
        throw new Error("CSV needs at least 10 data rows so the forecast model can build lag features.");
      }
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : "Invalid CSV file";
      setUploadError(message);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const res = await api.upload<MLPredictionResult>("/api/ml/predict?model_type=forecaster", formData);
      setForecastData(res);
      setUploadError(null);
      // Refresh predictions and stats to show the newly logged prediction
      await fetchDashboard();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to process CSV. Make sure it has retail schema (InvoiceDate, Quantity, UnitPrice).";
      setUploadError(errorMsg);
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleChurnUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setChurnError(null); setChurnResult(null); setChurnUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await api.upload<typeof churnResult>("/api/ml/predict?model_type=classifier", form);
      setChurnResult(res); await fetchDashboard();
    } catch (err) { setChurnError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setChurnUploading(false); if (churnRef.current) churnRef.current.value = ""; }
  }

  async function handleFraudUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFraudError(null); setFraudResult(null); setFraudUploading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const res = await api.upload<typeof fraudResult>("/api/ml/predict?model_type=anomaly", form);
      setFraudResult(res); await fetchDashboard();
    } catch (err) { setFraudError(err instanceof Error ? err.message : "Upload failed"); }
    finally { setFraudUploading(false); if (fraudRef.current) fraudRef.current.value = ""; }
  }

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

  // Prepare chart data if forecast exists
  let chartData: any[] = [];
  if (forecastData && forecastData.historical_data) {
    chartData = forecastData.historical_data.map((d) => ({
      name: new Date(d.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      Actual: d.actual,
      Forecast: null,
    }));
    
    // Add the forecasted point. We'll connect the last actual point to the forecast.
    if (chartData.length > 0) {
      const lastActual = chartData[chartData.length - 1];
      // Start the forecast line from the last actual point so it connects smoothly
      lastActual.Forecast = lastActual.Actual;
      
      chartData.push({
        name: "Next Month",
        Actual: null,
        Forecast: forecastData.prediction,
      });
    }
  }

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
              <div className="text-center mb-5 h-16 flex flex-col justify-center">
                {forecastData ? (
                  <>
                    <p className="text-emerald-600 text-3xl font-bold">
                      ${forecastData.prediction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Predicted next month revenue</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-xs">Upload retail CSV to populate</p>
                )}
              </div>

              {/* CSV Upload Drop Zone */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer relative"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                />
                {isUploading ? (
                  <Loader2 size={20} className="text-violet-600 animate-spin mx-auto mb-1.5" />
                ) : (
                  <Upload size={20} className="text-gray-400 mx-auto mb-1.5" />
                )}
                <p className="text-gray-700 text-xs" style={{ fontWeight: 600 }}>
                  {isUploading ? "Processing Model..." : "Drop monthly retail CSV here"}
                </p>
                <p className="text-gray-400 text-[11px] mt-1">
                  Needs InvoiceDate, Quantity, UnitPrice and at least 10 rows.
                </p>
              </div>
              
              {/* Error Message Display */}
              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-red-700 text-xs font-medium">{uploadError}</p>
                    <p className="text-red-600 text-[11px] mt-1">
                      CSV format required: InvoiceDate, Quantity, UnitPrice columns with at least 10 rows of data.
                    </p>
                  </div>
                </div>
              )}
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
              <div className="h-[200px] w-full mt-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280' }} dy={10} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#6B7280' }} 
                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                      />
                      <Line type="monotone" dataKey="Actual" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: "#10B981" }} activeDot={{ r: 5 }} connectNulls />
                      <Line type="monotone" dataKey="Forecast" stroke="#9CA3AF" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: "#9CA3AF" }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full border border-dashed border-gray-200 rounded flex items-center justify-center bg-gray-50">
                    <p className="text-xs text-gray-400">Chart will appear after CSV upload</p>
                  </div>
                )}
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Active alerts</p>
                </div>
                {alerts.length > 0 && (
                  <button
                    onClick={async () => {
                      await api.patch("/api/alerts/read-all");
                      setAlerts([]);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear all
                  </button>
                )}
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
                    <div key={a._id} className={`rounded-md border p-3 ${severityStyle(a.severity)} relative`}>
                      <button
                        onClick={async () => {
                          await api.patch(`/api/alerts/${a._id}/read`);
                          setAlerts(prev => prev.filter(x => x._id !== a._id));
                        }}
                        className="absolute top-2 right-2 opacity-50 hover:opacity-100 text-current"
                        title="Dismiss"
                      >
                        <X size={11} />
                      </button>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/60 inline-block mb-1.5" style={{ fontWeight: 700 }}>
                        {a.severity.toUpperCase()}
                      </span>
                      <p className="text-xs pr-4" style={{ fontWeight: 600 }}>{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ML Models — full-width row below the 70/30 grid */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Run ML Models</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Customer Churn */}
          <div className="border border-pink-100 rounded-lg p-4 bg-pink-50/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                <Users size={15} className="text-pink-600" />
              </div>
              <div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Customer Churn Prediction</p>
                <p className="text-gray-400 text-xs">Needs: tenure, MonthlyCharges, TotalCharges columns</p>
              </div>
            </div>
            <div className="border-2 border-dashed border-pink-200 rounded-lg p-4 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-all" onClick={() => churnRef.current?.click()}>
              <input ref={churnRef} type="file" accept=".csv" className="hidden" onChange={handleChurnUpload} disabled={churnUploading} />
              {churnUploading ? <Loader2 size={18} className="text-pink-500 animate-spin mx-auto mb-1.5" /> : <Upload size={18} className="text-pink-400 mx-auto mb-1.5" />}
              <p className="text-xs text-gray-600" style={{ fontWeight: 500 }}>{churnUploading ? "Analyzing customers…" : "Drop customer CSV here"}</p>
            </div>
            {churnError && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-xs">{churnError}</p>
              </div>
            )}
            {churnResult && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-pink-200 flex items-center justify-between">
                <div>
                  <p className="text-pink-600 text-xl" style={{ fontWeight: 800 }}>{(churnResult.prediction * 100).toFixed(1)}% churn risk</p>
                  <p className="text-gray-400 text-xs mt-0.5">Confidence {Math.round(churnResult.confidence * 100)}%{churnResult.cluster_label != null && ` · Cluster ${churnResult.cluster_label}`}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700" style={{ fontWeight: 600 }}>{churnResult.model_name}</span>
              </div>
            )}
          </div>

          {/* Transaction Fraud */}
          <div className="border border-violet-100 rounded-lg p-4 bg-violet-50/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <ShieldAlert size={15} className="text-violet-600" />
              </div>
              <div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Transaction Fraud Detection</p>
                <p className="text-gray-400 text-xs">Needs: Time, Amount, V1–V28 columns</p>
              </div>
            </div>
            <div className="border-2 border-dashed border-violet-200 rounded-lg p-4 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-all" onClick={() => fraudRef.current?.click()}>
              <input ref={fraudRef} type="file" accept=".csv" className="hidden" onChange={handleFraudUpload} disabled={fraudUploading} />
              {fraudUploading ? <Loader2 size={18} className="text-violet-500 animate-spin mx-auto mb-1.5" /> : <Upload size={18} className="text-violet-400 mx-auto mb-1.5" />}
              <p className="text-xs text-gray-600" style={{ fontWeight: 500 }}>{fraudUploading ? "Analyzing transactions…" : "Drop transactions CSV here"}</p>
            </div>
            {fraudError && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-xs">{fraudError}</p>
              </div>
            )}
            {fraudResult && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-violet-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-violet-600 text-xl" style={{ fontWeight: 800 }}>{(fraudResult.prediction * 100).toFixed(1)}% fraud prob.</p>
                    {fraudResult.anomaly_flag && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700" style={{ fontWeight: 700 }}>ANOMALY</span>}
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">Confidence {Math.round(fraudResult.confidence * 100)}%</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700" style={{ fontWeight: 600 }}>{fraudResult.model_name}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
