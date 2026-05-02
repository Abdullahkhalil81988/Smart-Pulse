import { useState } from "react";
import { TrendingUp, FileText, Plus, ChevronRight, Zap } from "lucide-react";
import { WireframeBox } from "../components/WireframeBox";

const invoices = [
  { id: "INV-0094", customer: "Alice Corp", amount: "$1,200.00", date: "Apr 4", due: "Apr 18", status: "PAID" },
  { id: "INV-0093", customer: "Bob & Sons", amount: "$3,450.00", date: "Apr 3", due: "Apr 17", status: "PENDING" },
  { id: "INV-0092", customer: "Carol Ltd", amount: "$780.00", date: "Apr 2", due: "Apr 16", status: "OVERDUE" },
  { id: "INV-0091", customer: "Dave Inc.", amount: "$5,600.00", date: "Apr 1", due: "Apr 15", status: "PAID" },
  { id: "INV-0090", customer: "Eve Trading", amount: "$920.00", date: "Mar 30", due: "Apr 13", status: "DRAFT" },
];

const statusColor: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-500",
};

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "invoices" | "performance">("summary");

  const tabs = [
    { key: "summary", label: "Daily summary" },
    { key: "invoices", label: "Invoices" },
    { key: "performance", label: "Product performance" },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header Area */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Sales</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5 mb-3">Invoicing & revenue analytics</p>

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
        </div>

        <div className="flex items-center gap-2">
          <div className="h-9 px-3 rounded-lg border border-gray-300 bg-white flex items-center text-sm text-gray-600">
            Today, Apr 4 ▾
          </div>
          <button className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-sm transition-colors" style={{ fontWeight: 600 }}>
            <Plus size={15} /> New invoice
          </button>
        </div>
      </div>

      {activeTab === "summary" && (
        <div className="space-y-4">
          {/* Top Row - KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue today */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Revenue today</p>
              <p className="text-gray-900 mt-1 mb-2" style={{ fontSize: 22, fontWeight: 700 }}>$12,480</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700" style={{ fontWeight: 600 }}>
                  +8%
                </span>
                <span className="text-xs text-gray-400">vs yesterday</span>
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Transactions</p>
              <p className="text-gray-900 mt-1 mb-2" style={{ fontSize: 22, fontWeight: 700 }}>342</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700" style={{ fontWeight: 600 }}>
                  +14
                </span>
                <span className="text-xs text-gray-400">vs yesterday</span>
              </div>
            </div>

            {/* Avg. order value */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Avg. order value</p>
              <p className="text-gray-900 mt-1 mb-2" style={{ fontSize: 22, fontWeight: 700 }}>$36.49</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700" style={{ fontWeight: 600 }}>
                  +6%
                </span>
                <span className="text-xs text-gray-400">vs yesterday</span>
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-xs">Invoices</p>
              <p className="text-gray-900 mt-1 mb-2" style={{ fontSize: 22, fontWeight: 700 }}>8</p>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-amber-100 text-amber-700" style={{ fontWeight: 600 }}>
                3 pending payment
              </span>
            </div>
          </div>

          {/* Main Content - 65/35 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
            {/* Left Column (65%) - Hourly Chart */}
            <div className="lg:col-span-6 bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Today's revenue — hourly</p>
                <button className="h-7 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center text-xs text-gray-600 transition-colors">
                  Time: 9 AM – 9 PM ▾
                </button>
              </div>
              <WireframeBox label="Vertical bar chart — hourly revenue" note="X: hours (9am-9pm) · Y: $ revenue" height={240} />
            </div>

            {/* Right Column (35%) - Breakdowns */}
            <div className="lg:col-span-4 space-y-4">
              {/* Revenue by channel */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Revenue by channel</p>
                <div className="space-y-3">
                  {[
                    { label: "In-store POS", pct: 62, val: "$7,738" },
                    { label: "Online", pct: 24, val: "$2,995" },
                    { label: "Invoice", pct: 14, val: "$1,747" },
                  ].map((ch) => (
                    <div key={ch.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-600">{ch.label}</span>
                        <span className="text-gray-900" style={{ fontWeight: 600 }}>{ch.val}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${ch.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <p className="text-gray-900 text-sm mb-4" style={{ fontWeight: 600 }}>Payment Methods</p>
                <div className="space-y-3">
                  {[
                    { method: "Credit Card", amount: 8100, pct: 65 },
                    { method: "Tap to Pay", amount: 3200, pct: 26 },
                    { method: "Cash", amount: 1180, pct: 9 },
                  ].map((item) => (
                    <div key={item.method}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-600">{item.method}</span>
                        <span className="text-gray-900" style={{ fontWeight: 600 }}>${item.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full">
                        <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="space-y-4">
          {/* Top Section - Category Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <p className="text-gray-900 text-sm mb-5" style={{ fontWeight: 600 }}>Revenue by Category</p>
            <div className="space-y-4">
              {[
                { category: "Coffee & Drinks", amount: 8400, color: "bg-blue-500" },
                { category: "Food & Pastries", amount: 3200, color: "bg-emerald-500" },
                { category: "Merchandise", amount: 880, color: "bg-amber-500" },
              ].map((item) => {
                const maxAmount = 8400;
                const percentage = (item.amount / maxAmount) * 100;
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>{item.category}</span>
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>${item.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className={`h-8 ${item.color} rounded-lg flex items-center justify-end px-3`}
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-white text-xs" style={{ fontWeight: 600 }}>
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Section - Top Products Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Top Selling Items</p>
              <button className="text-blue-600 text-xs hover:underline" style={{ fontWeight: 500 }}>
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>

            {/* Desktop: Table view */}
            <table className="hidden md:table w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Rank</th>
                  <th className="text-left px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Item Name</th>
                  <th className="text-left px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Category</th>
                  <th className="text-right px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Units Sold</th>
                  <th className="text-right px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Total Revenue</th>
                  <th className="text-left px-5 py-3 text-gray-500" style={{ fontWeight: 500 }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { rank: 1, name: "Latte", category: "Coffee", units: 420, revenue: 2016, trend: "+12%", trendColor: "bg-emerald-100 text-emerald-700" },
                  { rank: 2, name: "Cappuccino", category: "Coffee", units: 385, revenue: 1617, trend: "+8%", trendColor: "bg-emerald-100 text-emerald-700" },
                  { rank: 3, name: "Croissant", category: "Pastries", units: 312, revenue: 1185, trend: "+15%", trendColor: "bg-emerald-100 text-emerald-700" },
                  { rank: 4, name: "Iced Tea", category: "Drinks", units: 298, revenue: 894, trend: "-3%", trendColor: "bg-red-100 text-red-700" },
                  { rank: 5, name: "Blueberry Muffin", category: "Pastries", units: 245, revenue: 784, trend: "+5%", trendColor: "bg-emerald-100 text-emerald-700" },
                ].map((item) => (
                  <tr key={item.rank} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs" style={{ fontWeight: 600 }}>
                        {item.rank}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-900" style={{ fontWeight: 600 }}>{item.name}</td>
                    <td className="px-5 py-3 text-gray-600">{item.category}</td>
                    <td className="px-5 py-3 text-right text-gray-900" style={{ fontWeight: 500 }}>{item.units.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-gray-900" style={{ fontWeight: 600 }}>${item.revenue.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${item.trendColor}`} style={{ fontWeight: 600 }}>
                        {item.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile: Card list view */}
            <div className="md:hidden">
              {[
                { rank: 1, name: "Latte", category: "Coffee", units: 420, revenue: 2016, trend: "+12%", trendColor: "bg-emerald-100 text-emerald-700" },
                { rank: 2, name: "Cappuccino", category: "Coffee", units: 385, revenue: 1617, trend: "+8%", trendColor: "bg-emerald-100 text-emerald-700" },
                { rank: 3, name: "Croissant", category: "Pastries", units: 312, revenue: 1185, trend: "+15%", trendColor: "bg-emerald-100 text-emerald-700" },
                { rank: 4, name: "Iced Tea", category: "Drinks", units: 298, revenue: 894, trend: "-3%", trendColor: "bg-red-100 text-red-700" },
                { rank: 5, name: "Blueberry Muffin", category: "Pastries", units: 245, revenue: 784, trend: "+5%", trendColor: "bg-emerald-100 text-emerald-700" },
              ].map((item, index, array) => (
                <div
                  key={item.rank}
                  className={`px-4 py-4 ${
                    index !== array.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Top Row: Rank badge + Item name (left), Total Revenue (right) */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs flex-shrink-0" style={{ fontWeight: 600 }}>
                        {item.rank}
                      </span>
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{item.name}</span>
                    </div>
                    <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>${item.revenue.toLocaleString()}</span>
                  </div>

                  {/* Middle Row: Category (left), Trend badge (right) */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 text-xs">{item.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${item.trendColor}`} style={{ fontWeight: 600 }}>
                      {item.trend}
                    </span>
                  </div>

                  {/* Bottom Row: Units sold */}
                  <div className="text-gray-400 text-xs">
                    Units Sold: {item.units.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Invoice status summary - 2x2 grid on mobile, 4 columns on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total outstanding", value: "$4,370", color: "bg-amber-50 border-amber-200 text-amber-700" },
              { label: "Paid this month", value: "$6,800", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
              { label: "Overdue", value: "$780", color: "bg-red-50 border-red-200 text-red-700" },
              { label: "Drafts", value: "2", color: "bg-gray-50 border-gray-200 text-gray-600" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border p-3 ${s.color}`}>
                <p className="text-xs opacity-70">{s.label}</p>
                <p className="text-lg md:text-xl mt-1" style={{ fontWeight: 700 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Desktop: Invoice table */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Invoices</p>
              <div className="flex gap-2">
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500">All ▾</div>
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500">Sort ▾</div>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Invoice", "Customer", "Amount", "Issued", "Due", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-gray-500" style={{ fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-3 text-blue-600" style={{ fontWeight: 500 }}>{inv.id}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.customer}</td>
                    <td className="px-4 py-3 text-gray-900" style={{ fontWeight: 600 }}>{inv.amount}</td>
                    <td className="px-4 py-3 text-gray-400">{inv.date}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.due}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full ${statusColor[inv.status]}`} style={{ fontWeight: 600 }}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={13} className="text-gray-300" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Invoice cards */}
          <div className="md:hidden bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Invoices</p>
              <div className="flex gap-2">
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500">All ▾</div>
                <div className="h-7 px-2 rounded border border-gray-200 flex items-center text-xs text-gray-500">Sort ▾</div>
              </div>
            </div>
            <div>
              {invoices.map((inv, index) => (
                <div
                  key={inv.id}
                  className={`px-4 py-4 hover:bg-gray-50 cursor-pointer ${
                    index !== invoices.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Top Row: Invoice ID (left) and Status (right) */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-600 text-sm" style={{ fontWeight: 500 }}>{inv.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[inv.status]}`} style={{ fontWeight: 600 }}>
                      {inv.status}
                    </span>
                  </div>

                  {/* Middle Row: Customer (left) and Amount (right) */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 text-sm">{inv.customer}</span>
                    <span className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{inv.amount}</span>
                  </div>

                  {/* Bottom Row: Issue and Due dates */}
                  <div className="flex items-center text-xs text-gray-400">
                    <span>Issued: {inv.date}</span>
                    <span className="mx-2">•</span>
                    <span>Due: {inv.due}</span>
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
          <Zap size={12} className="text-blue-400" />
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Wireframe: Sales — Invoicing & forecasting</p>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Tabs: Daily summary (today's revenue) · Invoices (list + create) · Revenue forecast (predicted vs actual)</p>
      </div>
    </div>
  );
}
