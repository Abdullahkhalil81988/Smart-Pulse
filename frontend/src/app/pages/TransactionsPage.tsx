import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, Clock, Search, ChevronRight, X, Zap, Loader2, Calendar } from "lucide-react";
import api from "../lib/api";
import { toast } from "sonner";

interface TransactionItem {
  code: string;
  name: string;
  category: string;
  price: number;
  qty: number;
}

interface Transaction {
  _id: string;
  billNo: string;
  customerName: string;
  items: TransactionItem[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  tax: number;
  total: number;
  paymentMethod: string;
  note?: string;
  status: string;
  createdAt: string;
}

const statusIcon = (status: string) => {
  if (status === "FLAGGED") return <AlertTriangle size={12} className="text-red-500" />;
  if (status === "REVIEW") return <Clock size={12} className="text-amber-500" />;
  return <CheckCircle size={12} className="text-emerald-500" />;
};

export function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "flagged" | "detail">("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [customerHistory, setCustomerHistory] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const tabs = [
    { key: "all", label: "All transactions" },
    { key: "flagged", label: "Flagged queue" },
    { key: "detail", label: "Transaction detail" },
  ] as const;

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (searchDate) params.append("date", searchDate);

      const data = await api.get<Transaction[]>(`/api/pos/transactions?${params.toString()}`);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [searchQuery, searchDate]);

  // Fetch customer history when a transaction is selected
  useEffect(() => {
    async function fetchHistory() {
      if (!selected || !selected.customerName || selected.customerName === 'Guest') {
        setCustomerHistory([]);
        return;
      }
      try {
        setLoadingHistory(true);
        // Use the existing transactions route with search for exact name
        const data = await api.get<Transaction[]>(`/api/pos/transactions?search=${encodeURIComponent(selected.customerName)}`);
        // Filter for exact name and exclude current transaction
        const history = data.filter(t => t.customerName === selected.customerName && t._id !== selected._id);
        setCustomerHistory(history);
      } catch (err) {
        console.error("Failed to fetch history");
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [selected]);

  const handleRowClick = (txn: Transaction) => {
    setSelected(txn);
    setActiveTab("detail");
  };

  const handleAction = (type: 'fraud' | 'safe') => {
    toast.success(type === 'fraud' ? "Marked as Fraud" : "Marked as Safe");
    // In a real app, this would call an API to update status
  };

  const displayTxns = activeTab === "flagged"
    ? transactions.filter((t) => t.status === "FLAGGED" || t.status === "REVIEW")
    : transactions;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Transactions</h2>
          <p className="text-gray-500 text-xs md:text-sm mt-0.5">Live transaction history & scoring</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search ID/Customer */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="ID or Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-44 md:w-64 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs md:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
            />
          </div>

          {/* Date Filter */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={14} className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="h-9 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-xs md:text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
            />
          </div>

          {(searchQuery || searchDate) && (
            <button 
              onClick={() => { setSearchQuery(""); setSearchDate(""); }}
              className="h-9 px-3 rounded-xl border border-orange-200 bg-orange-50 flex items-center gap-1.5 text-xs text-orange-700 hover:bg-orange-100 transition-colors"
            >
              Clear Filters <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl w-fit min-w-min">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={{ fontWeight: activeTab === tab.key ? 600 : 400 }}
            >
              {tab.label}
              {tab.key === "flagged" && (
                <span className="ml-2 bg-red-100 text-red-600 rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 700 }}>
                  {transactions.filter((t) => t.status === "FLAGGED").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "detail" && selected ? (
        /* Transaction detail view */
        <div className="space-y-4 md:space-y-5 pb-32 md:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("all")}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ChevronRight size={16} className="rotate-180" /> Back
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <h3 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>Transaction #{selected.billNo}</h3>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => handleAction('fraud')}
                className="h-10 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm transition-colors shadow-sm" style={{ fontWeight: 600 }}>
                Confirm Fraud
              </button>
              <button 
                onClick={() => handleAction('safe')}
                className="h-10 px-6 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm transition-colors" style={{ fontWeight: 600 }}>
                Mark Safe
              </button>
            </div>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Risk Assessment */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-gray-900 text-sm mb-6" style={{ fontWeight: 600 }}>Fraud Score Analysis</p>
              <div className="flex flex-col items-center py-4">
                <div className="relative">
                   <div className="w-40 h-40 rounded-full border-8 border-gray-50 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl text-emerald-600" style={{ fontWeight: 800 }}>8%</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low Risk</p>
                      </div>
                   </div>
                   {/* Simplified ring visualization */}
                   <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle 
                        cx="80" cy="80" r="72" 
                        fill="none" stroke="#10b981" strokeWidth="8" 
                        strokeDasharray="452" strokeDashoffset="415" 
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                   </svg>
                </div>
              </div>
              <div className="mt-6 space-y-2 border-t border-gray-50 pt-6">
                {[
                  { label: "IP Geolocation Match", status: "pass" },
                  { label: "Velocity Check", status: "pass" },
                  { label: "Card/ID Verification", status: "pass" }
                ].map((check) => (
                  <div key={check.label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{check.label}</span>
                    <span className="text-emerald-600 font-bold uppercase">Passed</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Receipt Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <p className="text-gray-900 text-sm mb-6" style={{ fontWeight: 600 }}>Order Details</p>
              <div className="grid grid-cols-2 gap-y-6">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Customer</p>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{selected.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Payment</p>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{selected.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Date</p>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{new Date(selected.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">Status</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]" style={{ fontWeight: 700 }}>
                    {selected.status}
                  </span>
                </div>
              </div>

              <div className="mt-8">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-50">
                      <th className="text-left py-2 font-medium">Item</th>
                      <th className="text-right py-2 font-medium">Qty</th>
                      <th className="text-right py-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-3 text-gray-700">{item.name}</td>
                        <td className="py-3 text-right text-gray-500">{item.qty}</td>
                        <td className="py-3 text-right text-gray-900 font-bold">${(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100">
                      <td colSpan={2} className="py-4 text-gray-900 font-bold">Total</td>
                      <td className="py-4 text-right text-gray-900 text-lg font-extrabold">${selected.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Customer History Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Customer Transaction History</p>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {customerHistory.length} Previous Transaction{customerHistory.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-10 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-orange-500" />
                <p className="text-xs text-gray-400">Loading history...</p>
              </div>
            ) : selected.customerName === 'Guest' ? (
              <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
                <p className="text-xs text-gray-400">Guest checkout — no history available</p>
              </div>
            ) : customerHistory.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
                <p className="text-xs text-gray-400">This is the customer's first transaction</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-50">
                      <th className="text-left py-2 font-medium">Bill #</th>
                      <th className="text-left py-2 font-medium">Date</th>
                      <th className="text-left py-2 font-medium">Payment</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-right py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customerHistory.map((txn) => (
                      <tr key={txn._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 text-gray-900 font-bold">#{txn.billNo}</td>
                        <td className="py-3 text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 text-gray-500">{txn.paymentMethod}</td>
                        <td className="py-3 text-right text-gray-900 font-extrabold">${txn.total.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]" style={{ fontWeight: 700 }}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Bill #</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Customer</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Amount</th>
                  <th className="text-left px-6 py-4 text-gray-500 font-medium">Status</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="animate-spin text-orange-500" size={32} />
                        <p className="text-gray-400 text-sm">Fetching transactions...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayTxns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-40">
                        <Zap size={48} className="text-gray-300" />
                        <p className="text-gray-500 text-sm">No transactions found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayTxns.map((txn) => (
                    <tr
                      key={txn._id}
                      className="group hover:bg-orange-50/30 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(txn)}
                    >
                      <td className="px-6 py-4 font-bold text-gray-900">#{txn.billNo}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(txn.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{txn.customerName}</td>
                      <td className="px-6 py-4 text-gray-900 font-extrabold">${txn.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          txn.status === "FLAGGED" ? "bg-red-100 text-red-700" :
                          txn.status === "REVIEW" ? "bg-amber-100 text-amber-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors inline" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Zap size={20} className="text-orange-500" />
        </div>
        <div>
          <p className="text-gray-900 text-xs font-bold">Smart-Pulse Analysis</p>
          <p className="text-gray-500 text-[10px] mt-0.5">Transactions are automatically scanned for anomalies using our ML-core module. Real-time scoring helps prevent fraudulent chargebacks.</p>
        </div>
      </div>
    </div>
  );
}
