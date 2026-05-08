import { useEffect, useMemo, useState } from "react";
import { Users, ChevronRight, AlertTriangle, TrendingDown, Star, Zap, ShoppingBag, Mail, Loader2 } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";
import api from "../lib/api";

type Risk = "HIGH" | "MED" | "LOW";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  spend: number;
  visits: number;
  churn: number;
  risk: Risk;
  lastSeen: string | null;
}

interface CustomersResponse {
  customers: Customer[];
}

const riskColor: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MED: "bg-amber-100 text-amber-700",
  LOW: "bg-emerald-100 text-emerald-700",
};

const churnBarColor = (score: number) => {
  if (score >= 70) return "bg-red-400";
  if (score >= 40) return "bg-amber-400";
  return "bg-emerald-400";
};

export function CustomersPage() {
  const [activeTab, setActiveTab] = useState<"list" | "profile" | "atrisk">("list");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);
        const res = await api.get<CustomersResponse>("/api/customers?limit=200");
        const list = Array.isArray(res.customers) ? res.customers : [];
        setCustomers(list);
        setSelected((prev) => prev ?? list[0] ?? null);
      } catch (err) {
        console.error("Failed to fetch customers:", err);
        setCustomers([]);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const tabs = [
    { key: "list", label: "Customer list" },
    { key: "profile", label: "Customer profile" },
    { key: "atrisk", label: "At-risk list" },
  ] as const;

  const atRisk = useMemo(() => [...customers].sort((a, b) => b.churn - a.churn), [customers]);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Customers</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Churn CRM — risk scoring</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-2 text-xs md:text-sm text-gray-500 flex-1 sm:flex-initial min-w-0">
            <span className="truncate">🔍 Search customers…</span>
          </div>
          <button className="h-8 px-3 rounded-md border border-gray-300 bg-white text-xs md:text-sm text-gray-600 whitespace-nowrap">Export ↓</button>
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
            {tab.key === "atrisk" && (
              <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700 }}>
                {customers.filter((c) => c.risk === "HIGH").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "list" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Customer", "Email", "Total spend", "Visits", "Churn score", "Risk", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <Loader2 size={26} className="animate-spin mx-auto mb-2" />
                    <p>Loading customers…</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
                    <Users size={28} className="mx-auto mb-2 opacity-40" />
                    <p>No customers yet.</p>
                    <p className="text-[11px] mt-1">Create some POS transactions to populate this list.</p>
                  </td>
                </tr>
              ) : (
              customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => { setSelected(c); setActiveTab("profile"); }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-pink-600" style={{ fontSize: 10, fontWeight: 700 }}>
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <span className="text-gray-800" style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3 text-gray-900" style={{ fontWeight: 600 }}>
                    ${c.spend.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.visits}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-1.5 rounded-full ${churnBarColor(c.churn)}`} style={{ width: `${c.churn}%` }} />
                      </div>
                      <span className="text-gray-600">{c.churn}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full ${riskColor[c.risk]}`} style={{ fontWeight: 600 }}>
                      {c.risk}
                    </span>
                  </td>
                  <td className="px-4 py-3"><ChevronRight size={13} className="text-gray-300" /></td>
                </tr>
              )))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "profile" && selected && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600" style={{ fontSize: 16, fontWeight: 700 }}>
                  {selected.name.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{selected.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{selected.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${riskColor[selected.risk]}`} style={{ fontWeight: 600 }}>
                    {selected.risk} RISK
                  </span>
                  <span className="text-gray-400 text-xs">
                    Last seen {selected.lastSeen ? new Date(selected.lastSeen).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>${selected.spend.toLocaleString()}</p>
                <p className="text-gray-400 text-xs">lifetime spend</p>
              </div>
            </div>
            <WireframeBox label="Purchase history timeline" height={100} />
          </div>

          {/* Left/Right Column Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - AI & Vital Signs */}
            <div className="space-y-4">
              {/* AI Churn Risk Gauge */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>AI Churn Risk</p>

                {/* Half-circle speedometer gauge */}
                <div className="flex flex-col items-center py-6">
                  <div className="relative w-48 h-24">
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      {/* Green zone (LOW) */}
                      <path
                        d="M 10 95 A 90 90 0 0 1 70 20"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />
                      {/* Yellow zone (MED) */}
                      <path
                        d="M 70 20 A 90 90 0 0 1 130 20"
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />
                      {/* Red zone (HIGH) */}
                      <path
                        d="M 130 20 A 90 90 0 0 1 190 95"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="16"
                        strokeLinecap="round"
                      />
                      {/* Needle pointing to green zone (12/100) */}
                      <line
                        x1="100"
                        y1="95"
                        x2="35"
                        y2="60"
                        stroke="#1f2937"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      {/* Center dot */}
                      <circle cx="100" cy="95" r="5" fill="#1f2937" />
                    </svg>
                  </div>

                  <p className="text-emerald-600 text-2xl mt-2" style={{ fontWeight: 800 }}>
                    Score: 12/100
                  </p>
                  <p className="text-gray-400 text-xs mt-1">Low risk — healthy engagement</p>
                </div>
              </div>

              {/* Vital Context */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Vital Context</p>
                <div className="space-y-3">
                  {[
                    { label: "Days since last visit", value: "3" },
                    { label: "Support tickets", value: "0" },
                    { label: "Avg order value", value: "$141" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600 text-xs">{item.label}</span>
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Action Center */}
            <div className="space-y-4">
              {/* CRM Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>CRM Actions</p>
                <div className="space-y-2">
                  <button className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors" style={{ fontWeight: 600 }}>
                    Send Loyalty Reward
                  </button>
                  <button className="w-full h-9 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm transition-colors" style={{ fontWeight: 500 }}>
                    Add Note
                  </button>
                  <button className="w-full h-9 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm transition-colors" style={{ fontWeight: 500 }}>
                    Schedule Follow-up
                  </button>
                </div>
              </div>

              {/* Next Best Action */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-3" style={{ fontWeight: 600 }}>Next Best Action</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-white border border-blue-300 rounded text-blue-700" style={{ fontWeight: 600 }}>
                      Condition: VIP + High Spend
                    </span>
                    <span className="text-blue-400">→</span>
                    <span className="px-2 py-1 bg-blue-600 text-white rounded" style={{ fontWeight: 600 }}>
                      Action: Invite to Premium Tier
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Recent Activity</p>
                <div className="relative space-y-4">
                  {/* Vertical timeline line */}
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" />

                  {/* Event 1 */}
                  <div className="relative flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center flex-shrink-0 relative z-10">
                      <ShoppingBag size={14} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Purchased in-store - $45</p>
                      <p className="text-gray-400 text-xs mt-0.5">2 days ago</p>
                    </div>
                  </div>

                  {/* Event 2 */}
                  <div className="relative flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center flex-shrink-0 relative z-10">
                      <Mail size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Opened newsletter</p>
                      <p className="text-gray-400 text-xs mt-0.5">5 days ago</p>
                    </div>
                  </div>

                  {/* Event 3 */}
                  <div className="relative flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center flex-shrink-0 relative z-10">
                      <Star size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 text-xs" style={{ fontWeight: 500 }}>Left 5-star review</p>
                      <p className="text-gray-400 text-xs mt-0.5">1 week ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "atrisk" && (
        <div className="space-y-4">
          {/* Mobile: High & Med risk 50/50, Total at-risk revenue full width */}
          {/* Desktop: All 3 in a row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-red-400 text-red-700 p-3 md:p-4">
              <p className="text-gray-500 text-xs">High risk</p>
              <p className="mt-1 text-lg md:text-2xl" style={{ fontWeight: 700 }}>
                {customers.filter((c) => c.risk === "HIGH").length}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-amber-400 text-amber-700 p-3 md:p-4">
              <p className="text-gray-500 text-xs">Medium risk</p>
              <p className="mt-1 text-lg md:text-2xl" style={{ fontWeight: 700 }}>
                {customers.filter((c) => c.risk === "MED").length}
              </p>
            </div>
            <div className="col-span-2 md:col-span-1 bg-white rounded-lg border border-gray-200 border-l-4 border-l-pink-400 text-pink-700 p-3 md:p-4">
              <p className="text-gray-500 text-xs">Total at-risk revenue</p>
              <p className="mt-1 text-lg md:text-2xl" style={{ fontWeight: 700 }}>
                ${customers.filter((c) => c.risk !== "LOW").reduce((s, c) => s + c.spend, 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-500" />
              <p className="text-gray-900 text-xs md:text-sm" style={{ fontWeight: 600 }}>At-risk customers — sorted by risk</p>
            </div>

            {/* Desktop: Table view */}
            <table className="hidden md:table w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Customer", "Churn score", "Risk", "LTV", "Last seen", "Action"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {atRisk.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600" style={{ fontSize: 10, fontWeight: 700 }}>
                            {c.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <span className="text-gray-800" style={{ fontWeight: 500 }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                          <div className={`h-1.5 rounded-full ${churnBarColor(c.churn)}`} style={{ width: `${c.churn}%` }} />
                        </div>
                        <span className="text-gray-600">{c.churn}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${riskColor[c.risk]}`} style={{ fontWeight: 600 }}>{c.risk}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700" style={{ fontWeight: 600 }}>${c.spend.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400">{c.lastSeen ? new Date(c.lastSeen).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3">
                      <button className="px-2 py-1 rounded bg-pink-50 border border-pink-200 text-pink-600 hover:bg-pink-100 transition-colors" style={{ fontWeight: 500 }}>
                        Act ›
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile: Card list view */}
            <div className="md:hidden">
              {atRisk.map((c, index) => (
                <div
                  key={c.id}
                  className={`px-4 py-4 ${
                    index !== atRisk.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Top Row: Avatar + Name (left), Risk badge (right) */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-pink-600 text-xs" style={{ fontWeight: 700 }}>
                          {c.name.split(" ").map((n) => n[0]).join("")}
                        </span>
                      </div>
                      <span className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{c.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${riskColor[c.risk]}`} style={{ fontWeight: 600 }}>
                      {c.risk}
                    </span>
                  </div>

                  {/* Middle Row: Churn score (left), LTV (right) */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full">
                        <div className={`h-1.5 rounded-full ${churnBarColor(c.churn)}`} style={{ width: `${c.churn}%` }} />
                      </div>
                      <span className="text-gray-600 text-xs">{c.churn}</span>
                    </div>
                    <span className="text-gray-900 text-sm ml-4" style={{ fontWeight: 700 }}>{c.spend}</span>
                  </div>

                  {/* Bottom Row: Last seen (left), Action button (right) */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">
                      Last seen: {c.lastSeen ? new Date(c.lastSeen).toLocaleDateString() : "—"}
                    </span>
                    <button className="px-3 py-1.5 rounded bg-pink-50 border border-pink-200 text-pink-600 hover:bg-pink-100 transition-colors text-xs" style={{ fontWeight: 500 }}>
                      Act ›
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Annotation */}
      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-pink-400" />
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Customers — Churn CRM</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Tabs: Customer list (churn badges) · Customer profile (churn breakdown) · At-risk list (sorted by risk)</p>
      </div>
    </div>
  );
}
