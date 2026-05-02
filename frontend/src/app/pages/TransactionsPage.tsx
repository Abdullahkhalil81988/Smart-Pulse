import { useState } from "react";
import { AlertTriangle, CheckCircle, Clock, Filter, Search, ChevronRight, X, Zap } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";

const transactions = [
  { id: "#4821", date: "Apr 4, 2026", customer: "Maria S.", amount: "$348.00", status: "FLAGGED" },
  { id: "#4820", date: "Apr 4, 2026", customer: "Dave P.", amount: "$52.40", status: "OK" },
  { id: "#4819", date: "Apr 3, 2026", customer: "Unknown", amount: "$1,200.00", status: "FLAGGED" },
  { id: "#4818", date: "Apr 3, 2026", customer: "Alice C.", amount: "$18.75", status: "OK" },
  { id: "#4817", date: "Apr 3, 2026", customer: "Bob T.", amount: "$89.20", status: "REVIEW" },
];

const fraudBadgeColor = (score: number) => {
  if (score >= 75) return "bg-red-100 text-red-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
};

const statusIcon = (status: string) => {
  if (status === "FLAGGED") return <AlertTriangle size={12} className="text-red-500" />;
  if (status === "REVIEW") return <Clock size={12} className="text-amber-500" />;
  return <CheckCircle size={12} className="text-emerald-500" />;
};

export function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "flagged" | "detail">("all");
  const [selected, setSelected] = useState<typeof transactions[0] | null>(null);

  const tabs = [
    { key: "all", label: "All transactions" },
    { key: "flagged", label: "Flagged queue" },
    { key: "detail", label: "Transaction detail" },
  ] as const;

  const displayTxns = activeTab === "flagged"
    ? transactions.filter((t) => t.status === "FLAGGED" || t.status === "REVIEW")
    : transactions;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Transactions</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Fraud module — live scoring</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-2 text-xs md:text-sm text-gray-500">
            <Search size={13} /> <span className="hidden sm:inline">Search…</span>
          </div>
          <button className="h-8 px-3 rounded-md border border-blue-300 bg-blue-50 flex items-center gap-1.5 text-xs md:text-sm text-blue-700 whitespace-nowrap">
            Filtered: High Risk
            <X size={13} className="text-blue-500" />
          </button>
          <div className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center text-xs md:text-sm text-gray-600 whitespace-nowrap">
            Export ↓
          </div>
        </div>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit min-w-min">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
            >
              {tab.label}
              {tab.key === "flagged" && (
                <span className="ml-1.5 bg-red-100 text-red-600 rounded-full px-1.5 py-0.5" style={{ fontSize: 10, fontWeight: 700 }}>
                  {transactions.filter((t) => t.status === "FLAGGED").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "detail" ? (
        /* Transaction detail view */
        <div className="space-y-4 md:space-y-5 pb-32 md:pb-0">
          {/* Mobile: Back Button (Top Left) */}
          <button
            onClick={() => setActiveTab("flagged")}
            className="md:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronRight size={16} className="rotate-180" />
            <span>Back</span>
          </button>

          {/* Desktop: Header & Actions */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("flagged")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronRight size={14} className="rotate-180" /> Back to queue
              </button>
              <div className="w-px h-5 bg-gray-300" />
              <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Transaction #4821</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors" style={{ fontWeight: 600 }}>
                Confirm Fraud
              </button>
              <button className="h-10 px-5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm transition-colors" style={{ fontWeight: 600 }}>
                Dismiss (Mark Safe)
              </button>
            </div>
          </div>

          {/* Mobile: Transaction Title */}
          <h3 className="md:hidden text-gray-900 text-base" style={{ fontWeight: 700 }}>Transaction #4821</h3>

          {/* Top Row: AI Assessment - Stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-5">
            {/* Left Card: Risk Meter */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6">
              <p className="text-gray-900 text-sm mb-5" style={{ fontWeight: 600 }}>AI Risk Assessment</p>

              {/* Half-circle gauge */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-full max-w-xs md:max-w-none md:w-56 h-32 md:h-28">
                  <svg viewBox="0 0 200 100" className="w-full h-full">
                    {/* Green zone */}
                    <path
                      d="M 10 95 A 90 90 0 0 1 55 25"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="18"
                      strokeLinecap="round"
                    />
                    {/* Yellow zone */}
                    <path
                      d="M 55 25 A 90 90 0 0 1 145 25"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="18"
                      strokeLinecap="round"
                    />
                    {/* Red zone */}
                    <path
                      d="M 145 25 A 90 90 0 0 1 190 95"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="18"
                      strokeLinecap="round"
                    />
                    {/* Needle pointing to red zone (87%) */}
                    <line
                      x1="100"
                      y1="95"
                      x2="170"
                      y2="40"
                      stroke="#1f2937"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    {/* Center dot */}
                    <circle cx="100" cy="95" r="6" fill="#1f2937" />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-end justify-center pb-2">
                    <p className="text-red-600 text-3xl" style={{ fontWeight: 800 }}>87% Risk</p>
                  </div>
                </div>
              </div>

              {/* Risk factors */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                {["Amount anomaly", "Velocity check", "New terminal"].map((factor) => (
                  <div key={factor} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {factor}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card: Location Context */}
            <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6">
              <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Location Context</p>

              {/* Map placeholder */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 h-40 mb-4 flex items-center justify-center relative overflow-hidden">
                {/* Simple map visual */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-gray-100" />
                <div className="relative flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 border-4 border-white shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <p className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm" style={{ fontWeight: 500 }}>
                    Store Branch A
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                <p>Terminal location matches customer's home IP.</p>
              </div>
            </div>
          </div>

          {/* Middle Row: The Receipt */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6">
            <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Transaction Details</p>

            {/* Transaction metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 pb-5 border-b border-gray-100">
              {[
                { label: "Date/Time", value: "Apr 4, 2026 · 14:32:18" },
                { label: "Amount", value: "$348.00" },
                { label: "Payment Method", value: "Visa ending in 4821" },
                { label: "Cashier ID", value: "CSH-0042" },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-gray-400 text-xs mb-1">{field.label}</p>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{field.value}</p>
                </div>
              ))}
            </div>

            {/* Items table */}
            <p className="text-gray-700 text-xs mb-3" style={{ fontWeight: 500 }}>Purchased Items</p>
            <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500" style={{ fontWeight: 500 }}>Item</th>
                  <th className="text-right py-2 text-gray-500" style={{ fontWeight: 500 }}>Qty</th>
                  <th className="text-right py-2 text-gray-500" style={{ fontWeight: 500 }}>Price</th>
                  <th className="text-right py-2 text-gray-500" style={{ fontWeight: 500 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "Electronics", qty: 1, price: 249.00 },
                  { item: "Gift Cards", qty: 2, price: 50.00 },
                  { item: "Accessories", qty: 1, price: 49.00 },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{row.item}</td>
                    <td className="py-2 text-right text-gray-600">{row.qty}</td>
                    <td className="py-2 text-right text-gray-600">${row.price.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-900" style={{ fontWeight: 600 }}>
                      ${(row.qty * row.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Bottom Row: Customer Context */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 md:p-6">
            <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Recent Customer History</p>

            <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 text-gray-500" style={{ fontWeight: 500 }}>Date</th>
                  <th className="text-left px-3 py-2 text-gray-500" style={{ fontWeight: 500 }}>Amount</th>
                  <th className="text-left px-3 py-2 text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "Apr 3, 2026", amount: "$42.50", status: "Cleared" },
                  { date: "Apr 1, 2026", amount: "$128.00", status: "Cleared" },
                  { date: "Mar 28, 2026", amount: "$65.20", status: "Cleared" },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-3 py-3 text-gray-600">{row.date}</td>
                    <td className="px-3 py-3 text-gray-900" style={{ fontWeight: 600 }}>{row.amount}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700" style={{ fontWeight: 600 }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile: Fixed Bottom Action Buttons */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 space-y-2">
            <button className="w-full h-12 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition-colors" style={{ fontWeight: 600 }}>
              Confirm Fraud
            </button>
            <button className="w-full h-12 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm transition-colors" style={{ fontWeight: 600 }}>
              Dismiss (Mark Safe)
            </button>
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>ID</th>
                <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Date</th>
                <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Amount</th>
                <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Customer</th>
                <th className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {displayTxns.map((txn) => (
                <tr
                  key={txn.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => { setSelected(txn); setActiveTab("detail"); }}
                >
                  <td className="px-4 py-3 text-blue-600" style={{ fontWeight: 500 }}>{txn.id}</td>
                  <td className="px-4 py-3 text-gray-500">{txn.date}</td>
                  <td className="px-4 py-3 text-gray-900" style={{ fontWeight: 600 }}>{txn.amount}</td>
                  <td className="px-4 py-3 text-gray-700">{txn.customer}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full ${
                      txn.status === "FLAGGED" ? "bg-red-100 text-red-700" :
                      txn.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`} style={{ fontWeight: 600 }}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={13} className="text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
            <span className="text-xs text-gray-400">Showing 1-5 of 142 transactions</span>
            <div className="flex gap-1">
              <button className="w-7 h-7 rounded text-xs text-gray-300 cursor-not-allowed" disabled>
                &lt;
              </button>
              <button className="w-7 h-7 rounded text-xs bg-gray-900 text-white">
                1
              </button>
              <button className="w-7 h-7 rounded text-xs text-gray-500 hover:bg-gray-100">
                2
              </button>
              <button className="w-7 h-7 rounded text-xs text-gray-500 hover:bg-gray-100">
                3
              </button>
              <span className="w-7 h-7 flex items-center justify-center text-xs text-gray-400">
                ...
              </span>
              <button className="w-7 h-7 rounded text-xs text-gray-500 hover:bg-gray-100">
                29
              </button>
              <button className="w-7 h-7 rounded text-xs text-gray-500 hover:bg-gray-100">
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotation */}
      <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-amber-400" />
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Transactions — Fraud module</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Tabs: All transactions · Flagged queue (confirm/dismiss) · Transaction detail (score breakdown)</p>
      </div>
    </div>
  );
}
