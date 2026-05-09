import { useEffect, useState } from "react";
<<<<<<< HEAD
import { BarChart2, Activity, Zap, CheckCircle, X, Loader2 } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";
import api from "../lib/api";

=======
import { Activity, Zap, CheckCircle, X, Loader2, Package } from "lucide-react";
import api from "../lib/api";

interface MLReport {
  artifact_count: number;
  model_summary: Record<string, string[]>;
  anomaly_model_available: boolean;
  last_training: string | Record<string, unknown>;
}

>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3
interface PredictionStats {
  total: number;
  anomalies: number;
  accuracy: number | null;
  active_models: number;
}

interface PredictionItem {
  _id: string;
  model_name: string;
  model_type: string;
  prediction: number;
  confidence: number;
  anomaly_flag: boolean;
  correct?: boolean | null;
  createdAt: string;
  raw_input?: any;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AnalyticsPage() {
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState<"performance" | "log">("performance");
=======
  const [activeTab, setActiveTab] = useState<"performance" | "log" | "models">("performance");
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3
  const [showPanel, setShowPanel] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionItem | null>(null);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
=======
  const [mlReport, setMlReport] = useState<MLReport | null>(null);
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, predsRes] = await Promise.all([
          api.get<PredictionStats>("/api/predictions/stats"),
          api.get<{ predictions: PredictionItem[] }>("/api/predictions?limit=20"),
        ]);
        setStats(statsRes);
        setPredictions(predsRes.predictions);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
<<<<<<< HEAD
=======
    api.get<MLReport>("/api/ml/report").then(setMlReport).catch(() => {});
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  const tabs = [
    { key: "performance", label: "Model performance" },
    { key: "log", label: "Prediction log" },
<<<<<<< HEAD
=======
    { key: "models", label: "Model artifacts" },
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3
  ] as const;

  const verdictCounts = predictions.reduce(
    (acc, row) => {
      const score = Math.round(row.confidence * 100);
      const verdict = row.anomaly_flag ? "FRAUD" : score >= 60 ? "REVIEW" : "SAFE";
      acc[verdict] += 1;
      return acc;
    },
    { FRAUD: 0, REVIEW: 0, SAFE: 0 } as Record<"FRAUD" | "REVIEW" | "SAFE", number>
  );

  const feedbackCounts = predictions.reduce(
    (acc, row) => {
      if (row.correct === true) acc.confirmed += 1;
      else if (row.correct === false) acc.rejected += 1;
      else acc.pending += 1;
      return acc;
    },
    { confirmed: 0, rejected: 0, pending: 0 }
  );

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Analytics</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Model health — back office only</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 px-3 rounded-md border border-violet-300 bg-violet-50 flex items-center gap-2 text-xs md:text-sm text-violet-700">
            <span className="w-2 h-2 rounded-full bg-violet-400 inline-block" />
            <span className="whitespace-nowrap">Model v2.4 — live</span>
          </div>
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center text-xs md:text-sm text-gray-600 whitespace-nowrap">
            Last 7 days ▾
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "performance" && (
        <div className="space-y-5">
          {/* Header & Global Status */}
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Model Health & Performance</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle size={14} className="text-emerald-600" />
                <span className="text-emerald-700 text-xs" style={{ fontWeight: 600 }}>API Online</span>
              </div>
              <span className="text-gray-400 text-xs">Last model sync: 2 hours ago</span>
            </div>
          </div>

          {/* Model KPI Cards (Grid of 3) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Fraud Detection */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="mb-4">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Fraud Detection</p>
                <p className="text-gray-400 text-xs mt-0.5">Logistic Regression</p>
              </div>

              <p className="text-violet-600 mb-4" style={{ fontSize: 32, fontWeight: 800 }}>{stats?.accuracy ? Math.round(stats.accuracy) : 0}% Accuracy</p>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-xs">Precision</span>
                    <span className="text-gray-900 text-xs" style={{ fontWeight: 600 }}>88%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-violet-500 rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-xs">Recall</span>
                    <span className="text-gray-900 text-xs" style={{ fontWeight: 600 }}>96%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-violet-500 rounded-full" style={{ width: "96%" }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-gray-400 text-xs">Last trained: 14 days ago</span>
                <button className="text-violet-600 text-xs hover:underline" style={{ fontWeight: 500 }}>Retrain</button>
              </div>
            </div>

            {/* Card 2: Churn Prediction */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="mb-4">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Churn Prediction</p>
                <p className="text-gray-400 text-xs mt-0.5">Logistic Regression</p>
              </div>

              <p className="text-pink-600 mb-4" style={{ fontSize: 32, fontWeight: 800 }}>89% Accuracy</p>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-xs">Precision</span>
                    <span className="text-gray-900 text-xs" style={{ fontWeight: 600 }}>82%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-pink-500 rounded-full" style={{ width: "82%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-600 text-xs">Recall</span>
                    <span className="text-gray-900 text-xs" style={{ fontWeight: 600 }}>91%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-2 bg-pink-500 rounded-full" style={{ width: "91%" }} />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-gray-400 text-xs">Last trained: 14 days ago</span>
                <button className="text-pink-600 text-xs hover:underline" style={{ fontWeight: 500 }}>Retrain</button>
              </div>
            </div>

            {/* Card 3: Revenue Forecast */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="mb-4">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Revenue Forecast</p>
                <p className="text-gray-400 text-xs mt-0.5">Linear Regression</p>
              </div>

              <p className="text-blue-600 mb-4" style={{ fontSize: 32, fontWeight: 800 }}>R² Score: 0.92</p>

              <div className="mb-4">
                <p className="text-gray-600 text-xs mb-1">Mean Absolute Error</p>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>$420.00</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-gray-400 text-xs">Last trained: 14 days ago</span>
                <button className="text-blue-600 text-xs hover:underline" style={{ fontWeight: 500 }}>Retrain</button>
              </div>
            </div>
          </div>

          {/* Model Drift & Stability */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Model Drift & Stability (30 Days)</h3>
              <div className="h-7 px-3 rounded-md border border-gray-300 bg-white flex items-center text-xs text-gray-600">
                Timeline: Last 30 Days ▼
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Chart: Classification Stability */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-2" style={{ fontWeight: 600 }}>
                  Fraud & Churn Accuracy Drop-off
                </p>

                {/* Legend */}
                <div className="mb-4 flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-violet-500" />
                    <span className="text-gray-600">Fraud Detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-pink-500" />
                    <span className="text-gray-600">Churn Prediction</span>
                  </div>
                </div>

                <div className="relative h-48">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
                    <span>100%</span>
                    <span>95%</span>
                    <span>90%</span>
                    <span>85%</span>
                    <span>80%</span>
                    <span>75%</span>
                    <span>70%</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-10 h-full">
                    <svg viewBox="0 0 300 180" className="w-full h-full">
                      {/* Grid lines */}
                      <line x1="0" y1="0" x2="300" y2="0" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="30" x2="300" y2="30" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="120" x2="300" y2="120" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="150" x2="300" y2="150" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="180" x2="300" y2="180" stroke="#e5e7eb" strokeWidth="1" />

                      {/* Fraud Detection line (violet) - hovering around 90%, slight dip at end */}
                      <path
                        d="M 0 36 L 30 34 L 60 35 L 90 33 L 120 34 L 150 35 L 180 36 L 210 38 L 240 42 L 270 48 L 300 54"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                      />

                      {/* Churn Prediction line (pink) - hovering around 89%, slight dip at end */}
                      <path
                        d="M 0 42 L 30 41 L 60 40 L 90 42 L 120 41 L 150 43 L 180 42 L 210 44 L 240 48 L 270 52 L 300 58"
                        fill="none"
                        stroke="#ec4899"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-10 mt-2 flex justify-between text-xs text-gray-400">
                    <span>Day 1</span>
                    <span>Day 15</span>
                    <span>Day 30</span>
                  </div>
                </div>
              </div>

              {/* Right Chart: Regression Error */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-6" style={{ fontWeight: 600 }}>
                  Revenue Forecast Error (MAE)
                </p>

                <div className="relative h-48">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
                    <span>$1000</span>
                    <span>$850</span>
                    <span>$700</span>
                    <span>$550</span>
                    <span>$400</span>
                    <span>$250</span>
                    <span>$100</span>
                  </div>

                  {/* Chart area */}
                  <div className="ml-12 h-full">
                    <svg viewBox="0 0 300 180" className="w-full h-full">
                      {/* Grid lines */}
                      <line x1="0" y1="0" x2="300" y2="0" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="30" x2="300" y2="30" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="90" x2="300" y2="90" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="120" x2="300" y2="120" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="150" x2="300" y2="150" stroke="#e5e7eb" strokeWidth="1" />
                      <line x1="0" y1="180" x2="300" y2="180" stroke="#e5e7eb" strokeWidth="1" />

                      {/* MAE line (blue) - hovering around $400, spike to $900 around day 20 */}
                      <path
                        d="M 0 120 L 30 122 L 60 118 L 90 120 L 120 119 L 150 121 L 180 120 L 200 40 L 210 38 L 225 115 L 240 120 L 270 118 L 300 122"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />

                      {/* Spike indicator dot */}
                      <circle cx="210" cy="38" r="4" fill="#ef4444" />
                    </svg>
                  </div>

                  {/* X-axis labels */}
                  <div className="ml-12 mt-2 flex justify-between text-xs text-gray-400">
                    <span>Day 1</span>
                    <span>Day 15</span>
                    <span>Day 30</span>
                  </div>
                </div>

                {/* Alert notice */}
                <div className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <p className="text-amber-700 text-xs" style={{ fontWeight: 500 }}>
                    Spike detected on Day 20 — $900 MAE
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total inferences", value: stats?.total || 0, color: "border-l-violet-400" },
              { label: "FRAUD verdicts", value: verdictCounts.FRAUD, color: "border-l-red-400" },
              { label: "REVIEW verdicts", value: verdictCounts.REVIEW, color: "border-l-amber-400" },
              { label: "SAFE verdicts", value: verdictCounts.SAFE, color: "border-l-emerald-400" },
            ].map((s) => (
              <div key={s.label} className={`bg-white rounded-lg border border-gray-200 border-l-4 ${s.color} p-3`}>
                <p className="text-gray-500 text-xs">{s.label}</p>
                <p className="text-gray-900 mt-1" style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Prediction Audit Log table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={13} className="text-violet-500" />
                <p className="text-gray-900 text-xs md:text-sm" style={{ fontWeight: 600 }}>Prediction Audit Log</p>
              </div>
              <div className="flex gap-2">
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500 whitespace-nowrap">All verdicts ▾</div>
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500 hidden sm:flex">Export ↓</div>
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Timestamp</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Transaction ID</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Model Triggered</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Confidence Score</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Verdict</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Human Feedback</th>
                  <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}></th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((row) => {
                  const score = Math.round(row.confidence * 100);
                  const verdict = row.anomaly_flag ? "FRAUD" : score > 60 ? "REVIEW" : "SAFE";
                  const modelType = row.model_name.includes("Fraud") ? "Fraud Detector" : "Churn Predictor";
                  return (
                  <tr
                    key={row._id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedPrediction(row);
                      setShowPanel(true);
                    }}
                  >
                    <td className="px-4 py-3 text-gray-600 font-mono">{formatTime(row.createdAt)}</td>
                    <td className="px-4 py-3 text-violet-600" style={{ fontWeight: 500 }}>{row.raw_input?.transaction_id || row._id.slice(-6)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${modelType === "Fraud Detector" ? "bg-violet-100 text-violet-700" : "bg-pink-100 text-pink-700"}`} style={{ fontWeight: 600 }}>
                        {row.model_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${score >= 75 ? "text-red-600" : score >= 40 ? "text-amber-600" : "text-emerald-600"}`} style={{ fontWeight: 700 }}>
                        {score}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${verdict === "FRAUD" ? "text-red-600" : verdict === "REVIEW" ? "text-amber-600" : "text-emerald-600"}`} style={{ fontWeight: 600 }}>
                        {verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.correct === true ? (
                        <span className="text-emerald-600 text-xs" style={{ fontWeight: 500 }}>✓ Confirmed</span>
                      ) : row.correct === false ? (
                        <span className="text-red-600 text-xs" style={{ fontWeight: 500 }}>✕ Rejected</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-violet-600 hover:underline text-xs">View details →</button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
              <span className="text-xs text-gray-400">Showing {predictions.length} of {stats?.total || 0} inferences today</span>
              <div className="flex gap-1">
                {["←", "1", "2", "3", "→"].map((p, i) => (
                  <button key={i} className={`w-7 h-7 rounded text-xs ${p === "1" ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Annotation */}
      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-violet-400" />
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Analytics — Model health (back office only)</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Tabs: Model performance (accuracy, confusion matrix, drift) · Prediction log (all inferences)</p>
      </div>
=======
      {activeTab === "models" && (
        <div className="space-y-4">
          {!mlReport ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Loading model report…</span>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total artifacts", value: mlReport.artifact_count },
                  { label: "Forecaster", value: mlReport.model_summary.forecaster?.length ?? 0 },
                  { label: "Classifier", value: mlReport.model_summary.classifier?.length ?? 0 },
                  { label: "Anomaly detector", value: mlReport.model_summary.anomaly?.length ?? 0 },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3">
                    <p className="text-gray-400 text-xs">{s.label}</p>
                    <p className="text-gray-900 mt-1 text-xl" style={{ fontWeight: 700 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Artifact list */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Package size={13} className="text-violet-500" />
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Deployed model files</p>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${mlReport.anomaly_model_available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`} style={{ fontWeight: 600 }}>
                    {mlReport.anomaly_model_available ? "Anomaly model ready" : "Anomaly model missing"}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Type</th>
                      <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Files</th>
                      <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mlReport.model_summary).map(([type, files]) => (
                      <tr key={type} className="border-b border-gray-50">
                        <td className="px-4 py-3 text-gray-700 capitalize" style={{ fontWeight: 600 }}>{type}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono">{(files as string[]).join(", ") || "—"}</td>
                        <td className="px-4 py-3">
                          {(files as string[]).length > 0
                            ? <span className="text-emerald-600 text-xs" style={{ fontWeight: 600 }}>✓ Loaded</span>
                            : <span className="text-red-500 text-xs" style={{ fontWeight: 600 }}>✗ Missing</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400">
                    Last training: {typeof mlReport.last_training === "string" ? mlReport.last_training : JSON.stringify(mlReport.last_training)}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
>>>>>>> 6eab19e008cd1df2c74fa13d07ce9e114dd1d8f3

      {/* Side Panel Overlay */}
      {showPanel && (
        <>
          {/* Dark Overlay Background */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
            onClick={() => setShowPanel(false)}
          />

          {/* Side Panel - Desktop: slide from right, Mobile: bottom sheet */}
          <div className="fixed md:top-0 bottom-0 md:bottom-auto md:right-0 left-0 right-0 md:left-auto h-[90vh] md:h-full w-full md:max-w-xl bg-white shadow-2xl z-50 overflow-y-auto rounded-t-2xl md:rounded-none">
            {/* Mobile swipe indicator */}
            <div className="md:hidden flex justify-center pt-2 pb-1">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
              <h3 className="text-gray-900 text-sm md:text-base" style={{ fontWeight: 700 }}>
                Audit Log: {selectedPrediction?.model_name || "Model"}
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Raw Input Section */}
              <div>
                <h4 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>
                  Input Payload (JSON)
                </h4>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-emerald-400 text-xs font-mono overflow-x-auto">
{JSON.stringify(selectedPrediction?.raw_input || { error: "No payload available" }, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Output & Execution Section */}
              <div>
                <h4 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>
                  Execution Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Left Card */}
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <p className="text-violet-600 text-xs mb-1" style={{ fontWeight: 500 }}>
                      Model Version
                    </p>
                    <p className="text-violet-900 text-lg font-mono" style={{ fontWeight: 700 }}>
                      v1.4.2
                    </p>
                  </div>

                  {/* Right Card */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-600 text-xs mb-1" style={{ fontWeight: 500 }}>
                      Execution Time
                    </p>
                    <p className="text-blue-900 text-lg font-mono" style={{ fontWeight: 700 }}>
                      42ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Action Section */}
              <div>
                <h4 className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>
                  Human Override
                </h4>
                <p className="text-gray-900 mb-4" style={{ fontWeight: 700 }}>
                  Was this prediction correct?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Yes Button */}
                  <button
                    onClick={async () => {
                      if (!selectedPrediction?._id) return;
                      try {
                        await api.post(`/api/predictions/feedback/${selectedPrediction._id}`, { correct: true });
                        setPredictions((prev) =>
                          prev.map((p) => (p._id === selectedPrediction._id ? { ...p, correct: true } : p))
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="h-12 rounded-lg bg-emerald-600 text-white flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    <CheckCircle size={18} />
                    Yes (True Positive)
                  </button>

                  {/* No Button */}
                  <button
                    onClick={async () => {
                      if (!selectedPrediction?._id) return;
                      try {
                        await api.post(`/api/predictions/feedback/${selectedPrediction._id}`, { correct: false });
                        setPredictions((prev) =>
                          prev.map((p) => (p._id === selectedPrediction._id ? { ...p, correct: false } : p))
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="h-12 rounded-lg bg-red-600 text-white flex items-center justify-center gap-2 hover:bg-red-700 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    <X size={18} />
                    No (False Positive)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
