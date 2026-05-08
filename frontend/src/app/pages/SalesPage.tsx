import { useState, useEffect } from "react";
import { TrendingUp, FileText, Plus, ChevronRight, Zap, Loader2, Calendar, Search, ArrowLeft, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../lib/api";
import { toast } from "sonner";

interface SaleStats {
  revenue: number;
  prevRevenue: number;
  count: number;
  prevCount: number;
  avgOrder: number;
  invoiceCount: number;
  pendingInvoices: number;
  paymentDistribution: Record<string, number>;
}

interface ProductPerformance {
  topProducts: any[];
  categoryStats: Record<string, number>;
}

interface Transaction {
  _id: string;
  billNo: string;
  customerName: string;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: any[];
}

export function SalesPage() {
  const [activeTab, setActiveTab] = useState<"summary" | "invoices" | "performance">("summary");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SaleStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [performance, setPerformance] = useState<ProductPerformance | null>(null);
  const [invoices, setInvoices] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Invoice Form State
  const [invCustomer, setInvCustomer] = useState("");
  const [invItems, setInvItems] = useState<any[]>([]);
  const [invNote, setInvNote] = useState("");

  const tabs = [
    { key: "summary", label: "Daily summary" },
    { key: "invoices", label: "Invoices" },
    { key: "performance", label: "Product performance" },
  ] as const;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, cData, pData, iData] = await Promise.all([
        api.get<SaleStats>(`/api/sales/stats?date=${selectedDate}`),
        api.get<number[]>(`/api/sales/chart?date=${selectedDate}`),
        api.get<ProductPerformance>(`/api/sales/performance`),
        api.get<Transaction[]>(`/api/pos/transactions?search=Invoice`)
      ]);
      setStats(sData);
      setChartData(cData.map((val, hour) => ({ 
        time: `${hour}:00`, 
        revenue: val 
      })).filter((_, i) => i >= 9 && i <= 21)); // 9 AM to 9 PM as per wireframe
      setPerformance(pData);
      setInvoices(iData);
    } catch (err) {
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, activeTab]);

  const handleCreateInvoice = async () => {
    if (!invCustomer.trim()) return toast.error("Customer name is required");
    if (invItems.length === 0) return toast.error("Add at least one item");

    try {
      setLoading(true);
      const subtotal = invItems.reduce((s, i) => s + i.price * i.qty, 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      await api.post("/api/pos/checkout", {
        customerName: invCustomer,
        items: invItems,
        subtotal,
        tax,
        total,
        paymentMethod: "Invoice",
        status: "Pending",
        note: invNote
      });

      toast.success("Invoice created successfully");
      setIsCreatingInvoice(false);
      setInvCustomer("");
      setInvItems([]);
      fetchData();
    } catch (err) {
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  if (isCreatingInvoice) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
        <button 
          onClick={() => setIsCreatingInvoice(false)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Sales
        </button>
        
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-gray-900 text-lg font-bold">Create New Invoice</h3>
            <p className="text-gray-500 text-xs mt-1">Generate a formal payment request for your customer.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Customer Name *</label>
                <input 
                  type="text" 
                  value={invCustomer}
                  onChange={(e) => setInvCustomer(e.target.value)}
                  placeholder="Enter client or company name"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Invoice Date</label>
                <input 
                  type="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Items & Services</label>
                  <button 
                    onClick={() => setInvItems([...invItems, { name: "", qty: 1, price: 0 }])}
                    className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Item
                  </button>
               </div>
               
               <div className="space-y-3">
                  {invItems.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                      <input 
                        type="text" 
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...invItems];
                          newItems[idx].name = e.target.value;
                          setInvItems(newItems);
                        }}
                        className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm"
                      />
                      <input 
                        type="number" 
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => {
                          const newItems = [...invItems];
                          newItems[idx].qty = parseInt(e.target.value) || 0;
                          setInvItems(newItems);
                        }}
                        className="w-20 h-11 px-4 rounded-xl border border-gray-200 text-sm"
                      />
                      <input 
                        type="number" 
                        placeholder="Price"
                        value={item.price}
                        onChange={(e) => {
                          const newItems = [...invItems];
                          newItems[idx].price = parseFloat(e.target.value) || 0;
                          setInvItems(newItems);
                        }}
                        className="w-28 h-11 px-4 rounded-xl border border-gray-200 text-sm"
                      />
                      <button 
                        onClick={() => setInvItems(invItems.filter((_, i) => i !== idx))}
                        className="h-11 w-11 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {invItems.length === 0 && (
                    <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                      <p className="text-sm text-gray-400">No items added yet. Click 'Add Item' to begin.</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start">
               <div className="w-full md:w-1/2 space-y-2">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Note (Optional)</label>
                  <textarea 
                    value={invNote}
                    onChange={(e) => setInvNote(e.target.value)}
                    placeholder="Payment terms, bank details, etc."
                    className="w-full h-24 p-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
               </div>
               <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="text-gray-900 font-bold">${invItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax (8%)</span>
                    <span className="text-gray-900 font-bold">${(invItems.reduce((s, i) => s + i.price * i.qty, 0) * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="text-gray-900 font-bold">Total Amount</span>
                    <span className="text-blue-600 text-xl font-extrabold">${(invItems.reduce((s, i) => s + i.price * i.qty, 0) * 1.08).toFixed(2)}</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
             <button 
               onClick={() => setIsCreatingInvoice(false)}
               className="px-6 h-12 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
             >
               Cancel
             </button>
             <button 
               onClick={handleCreateInvoice}
               disabled={loading}
               className="px-8 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
             >
               {loading && <Loader2 size={16} className="animate-spin" />}
               Generate Invoice
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Sales Analytics</h2>
          <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit mt-3">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={14} className="text-gray-400 group-focus-within:text-blue-500" />
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button 
            onClick={() => setIsCreatingInvoice(true)}
            className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-100 transition-all"
          >
            <Plus size={16} /> New Invoice
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 size={48} className="animate-spin text-blue-500" />
          <p className="text-gray-400 text-sm animate-pulse">Analyzing revenue streams...</p>
        </div>
      ) : activeTab === "summary" && stats ? (
        <div className="space-y-4 animate-in fade-in duration-500">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Revenue Today", value: `$${stats.revenue.toLocaleString()}`, trend: stats.revenue >= stats.prevRevenue ? `+${(stats.revenue - stats.prevRevenue).toFixed(0)}` : `-${(stats.prevRevenue - stats.revenue).toFixed(0)}`, positive: stats.revenue >= stats.prevRevenue },
              { label: "Transactions", value: stats.count, trend: stats.count >= stats.prevCount ? `+${stats.count - stats.prevCount}` : `-${stats.prevCount - stats.count}`, positive: stats.count >= stats.prevCount },
              { label: "Avg. Order Today", value: `$${stats.avgOrder.toFixed(2)}`, trend: "vs yesterday", positive: true },
              { label: "Active Invoices", value: stats.invoiceCount, trend: `${stats.pendingInvoices} pending`, positive: false },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
                <p className="text-gray-900 mt-2 mb-3 text-2xl font-extrabold">{card.value}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${card.positive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {card.trend}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">from last period</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <p className="text-gray-900 text-sm font-bold">Revenue Pulse — Hourly</p>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full text-[10px] font-bold text-gray-400">
                  <TrendingUp size={12} className="text-emerald-500" /> +12% Efficiency
                </div>
              </div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="time" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-900 text-sm font-bold mb-6">Revenue by Channel</p>
                <div className="space-y-5">
                  {[
                    { label: "In-store POS", val: stats.revenue - (invoices.reduce((s,i) => s + (new Date(i.createdAt).toDateString() === new Date(selectedDate).toDateString() ? i.total : 0), 0)), color: "bg-blue-500" },
                    { label: "Invoice", val: invoices.reduce((s,i) => s + (new Date(i.createdAt).toDateString() === new Date(selectedDate).toDateString() ? i.total : 0), 0), color: "bg-emerald-500" },
                  ].map((ch, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 font-medium">{ch.label}</span>
                        <span className="text-gray-900 font-bold">${ch.val.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                        <div className={`h-2 ${ch.color} rounded-full`} style={{ width: `${(ch.val / stats.revenue) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <p className="text-gray-900 text-sm font-bold mb-6">Payment Distribution</p>
                <div className="space-y-4">
                  {Object.entries(stats.paymentDistribution).map(([method, amount], i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 font-medium">{method}</span>
                        <span className="text-gray-900 font-bold">${amount.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-2 bg-orange-500 rounded-full" style={{ width: `${(amount / stats.revenue) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  {Object.keys(stats.paymentDistribution).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No payments recorded today</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "performance" && performance ? (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
             <p className="text-gray-900 text-sm font-bold mb-8">Category Revenue Breakdown</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(performance.categoryStats).map(([cat, rev], i) => (
                  <div key={i} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{cat}</p>
                    <p className="text-gray-900 text-xl font-black mt-1">${rev.toLocaleString()}</p>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full mt-4 overflow-hidden">
                       <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(rev / Object.values(performance.categoryStats).reduce((a,b)=>a+b, 0)) * 100}%` }} />
                    </div>
                  </div>
                ))}
             </div>
           </div>

           <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
             <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-gray-900 text-sm font-bold">Top Performing Products</p>
             </div>
             <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-medium uppercase tracking-tighter">Product</th>
                    <th className="text-left px-6 py-4 font-medium uppercase tracking-tighter">Category</th>
                    <th className="text-right px-6 py-4 font-medium uppercase tracking-tighter">Units</th>
                    <th className="text-right px-6 py-4 font-medium uppercase tracking-tighter">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {performance.topProducts.map((item, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-500">{item.category}</td>
                      <td className="px-6 py-4 text-right text-gray-600 font-medium">{item.units}</td>
                      <td className="px-6 py-4 text-right text-blue-600 font-extrabold">${item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>
      ) : activeTab === "invoices" && (
        <div className="space-y-4 animate-in fade-in duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-100">
                 <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">Total Outstanding</p>
                 <p className="text-3xl font-black mt-2">${invoices.filter(i => i.status === 'Pending').reduce((s,i) => s + i.total, 0).toLocaleString()}</p>
                 <p className="text-blue-200 text-[10px] mt-4 flex items-center gap-1"><Zap size={10} /> Needs Attention</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                 <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Collected this Month</p>
                 <p className="text-3xl text-gray-900 font-black mt-2">${invoices.filter(i => i.status === 'Completed').reduce((s,i) => s + i.total, 0).toLocaleString()}</p>
                 <p className="text-emerald-500 text-[10px] mt-4 font-bold flex items-center gap-1"><TrendingUp size={10} /> +22% vs last month</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                 <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Pending Drafts</p>
                 <p className="text-3xl text-gray-900 font-black mt-2">0</p>
                 <p className="text-gray-400 text-[10px] mt-4">All items published</p>
              </div>
           </div>

           <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
             <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <p className="text-gray-900 text-sm font-bold">Active Invoices</p>
             </div>
             <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 border-b border-gray-100">
                    <th className="text-left px-6 py-4 font-medium">Bill #</th>
                    <th className="text-left px-6 py-4 font-medium">Customer</th>
                    <th className="text-right px-6 py-4 font-medium">Total</th>
                    <th className="text-left px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center text-gray-400 text-sm italic">No invoices found</td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">#{inv.billNo}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{inv.customerName}</td>
                        <td className="px-6 py-4 text-right text-gray-900 font-extrabold">${inv.total.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 font-bold hover:underline">View Detail</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Annotation */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-blue-500" />
        </div>
        <div>
          <p className="text-gray-900 text-xs font-bold">Sales & Invoicing Powered by Smart-Pulse</p>
          <p className="text-gray-500 text-[10px] mt-0.5">Real-time revenue tracking and professional invoicing automated for your business efficiency.</p>
        </div>
      </div>
    </div>
  );
}
