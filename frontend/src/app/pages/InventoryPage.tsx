import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Plus, Pencil, Check, X, Trash2, Package,
  AlertTriangle, ChevronDown, ArrowUpDown, Upload, Loader2,
} from "lucide-react";
import { auth } from "../../firebase-config";
import Papa from "papaparse";

// ─── Data types ──────────────────────────────────────────────────────────────
interface InventoryItem {
  _id?: string;
  code: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowThreshold: number;
  unit: string;
}

const CATEGORIES = ["All", "Coffee", "Food", "Drinks", "Snacks"];
const STATUS_FILTERS = ["All", "In Stock", "Low Stock", "Out of Stock"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stockStatus(item: InventoryItem): "Out of Stock" | "Low Stock" | "In Stock" {
  if (item.stock === 0) return "Out of Stock";
  if (item.stock <= item.lowThreshold) return "Low Stock";
  return "In Stock";
}

function StatusBadge({ status }: { status: ReturnType<typeof stockStatus> }) {
  const styles = {
    "In Stock": "bg-emerald-100 text-emerald-700",
    "Low Stock": "bg-amber-100 text-amber-700",
    "Out of Stock": "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status]}`} style={{ fontWeight: 600 }}>
      {status}
    </span>
  );
}

// ─── Empty row template ────────────────────────────────────────────────────────
const emptyNewItem: Omit<InventoryItem, "code"> & { code: string } = {
  code: "",
  name: "",
  category: "Coffee",
  price: 0,
  stock: 0,
  lowThreshold: 10,
  unit: "pcs",
};

// ─── Main component ───────────────────────────────────────────────────────────
export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<InventoryItem | null>(null);
  
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  
  const [newItem, setNewItem] = useState({ ...emptyNewItem });
  const [addError, setAddError] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  
  const [restockItemCode, setRestockItemCode] = useState("");
  const [restockAmount, setRestockAmount] = useState<number>(0);
  const [restockError, setRestockError] = useState("");
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkRestockAmounts, setBulkRestockAmounts] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

  // ── Fetch Data ──────────────────────────────────────────────────────────────
  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const data = await res.json();
      setInventory(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is logged in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchInventory();
      } else {
        setInventory([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const lowCount = inventory.filter((i) => stockStatus(i) === "Low Stock").length;
  const outCount = inventory.filter((i) => stockStatus(i) === "Out of Stock").length;

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesCat = activeCategory === "All" || item.category === activeCategory;
      const matchesStatus = statusFilter === "All" || stockStatus(item) === statusFilter;
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesStatus && matchesSearch;
    });
  }, [inventory, activeCategory, statusFilter, search]);

  // ── Edit helpers ────────────────────────────────────────────────────────────
  const startEdit = (item: InventoryItem) => {
    setEditingId(item._id!);
    setEditDraft({ ...item });
  };

  const saveEdit = async () => {
    if (!editDraft || !editDraft._id) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/inventory/${editDraft._id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editDraft)
      });

      if (!res.ok) throw new Error("Failed to update item");
      const updatedItem = await res.json();

      setInventory((prev) => prev.map((i) => (i._id === updatedItem._id ? updatedItem : i)));
      setEditingId(null);
      setEditDraft(null);
      flash(`${editDraft.name} updated`);
    } catch (err: any) {
      console.error(err);
      flash("Failed to update item");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const deleteItem = async (code: string) => {
    const item = inventory.find((i) => i.code === code);
    if (!item || !item._id) return;

    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/inventory/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete item");

      setInventory((prev) => prev.filter((i) => i._id !== item._id));
      flash(`${item.name} removed`);
      
      // Cleanup selection if deleted
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    } catch (err: any) {
      console.error(err);
      flash("Failed to delete item");
    }
  };

  // ── Restock helpers ──────────────────────────────────────────────────────
  const handleRestock = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();

      if (selectedItems.size > 0) {
        // Bulk restock
        const updates = Array.from(selectedItems)
          .map(code => ({ code, amount: bulkRestockAmounts[code] || 0 }))
          .filter(update => update.amount > 0);

        if (updates.length === 0) {
          setRestockError("Enter at least one valid amount");
          return;
        }

        const res = await fetch(`${API_URL}/api/inventory/bulk-restock`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ updates })
        });

        if (!res.ok) throw new Error("Failed to bulk restock");
        const updatedItems = await res.json();

        setInventory((prev) => 
          prev.map((item) => {
            const updated = updatedItems.find((u: any) => u.code === item.code);
            return updated ? updated : item;
          })
        );
        
        flash(`Restocked ${updatedItems.length} item${updatedItems.length !== 1 ? "s" : ""}`);
        setShowRestockModal(false);
        setBulkRestockAmounts({});
        setSelectedItems(new Set());
        setRestockError("");
      } else {
        // Single restock (legacy)
        if (!restockItemCode) {
          setRestockError("Please select an item");
          return;
        }
        if (!restockAmount || restockAmount <= 0) {
          setRestockError("Please enter a valid quantity");
          return;
        }

        const updates = [{ code: restockItemCode, amount: restockAmount }];
        const res = await fetch(`${API_URL}/api/inventory/bulk-restock`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ updates })
        });

        if (!res.ok) throw new Error("Failed to restock item");
        const updatedItems = await res.json();

        if (updatedItems.length > 0) {
           setInventory((prev) => 
            prev.map((item) => item.code === updatedItems[0].code ? updatedItems[0] : item)
          );
          flash(`Added ${restockAmount} to ${updatedItems[0].name}`);
        }
        
        setShowRestockModal(false);
        setRestockItemCode("");
        setRestockAmount(0);
        setRestockError("");
      }
    } catch (err: any) {
      console.error(err);
      setRestockError(err.message || "Failed to restock");
    }
  };

  const handleMarkOutOfStock = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const itemsToUpdate = inventory.filter(item => selectedItems.has(item.code));
      
      const promises = itemsToUpdate.map(item => 
        fetch(`${API_URL}/api/inventory/${item._id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({ ...item, stock: 0 })
        }).then(r => r.json())
      );

      const updatedItems = await Promise.all(promises);

      setInventory((prev) =>
        prev.map((item) => {
          const updated = updatedItems.find((u: any) => u.code === item.code);
          return updated ? updated : item;
        })
      );
      
      flash(`Marked ${selectedItems.size} item${selectedItems.size !== 1 ? "s" : ""} as out of stock`);
      setSelectedItems(new Set());
    } catch (err) {
      console.error(err);
      flash("Failed to mark items out of stock");
    }
  };

  // ── Add new item ────────────────────────────────────────────────────────────
  const handleAddItem = async () => {
    if (!newItem.code.trim()) { setAddError("Item code is required"); return; }
    if (!newItem.name.trim()) { setAddError("Name is required"); return; }
    if (inventory.find((i) => i.code.toUpperCase() === newItem.code.toUpperCase())) {
      setAddError("Item code already exists");
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const payload = { ...newItem, code: newItem.code.toUpperCase() };

      const res = await fetch(`${API_URL}/api/inventory`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add item");
      }

      const addedItem = await res.json();
      
      setInventory((prev) => [addedItem, ...prev]);
      flash(`${addedItem.name} added to inventory`);
      setNewItem({ ...emptyNewItem });
      setShowAddModal(false);
      setAddError("");
    } catch (err: any) {
      console.error(err);
      setAddError(err.message || "Failed to add item");
    }
  };

  // ── CSV Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setIsLoading(true);
          const token = await auth.currentUser?.getIdToken();
          
          // Map CSV rows to InventoryItem structure
          const items = results.data.map((row: any) => ({
            code: row.code || row.Code || "",
            name: row.name || row.Name || "",
            category: row.category || row.Category || "Uncategorized",
            price: parseFloat(row.price || row.Price) || 0,
            stock: parseInt(row.stock || row.Stock || row.Qty) || 0,
            lowThreshold: parseInt(row.lowThreshold || row["Low Threshold"] || row.MinLevel) || 10,
            unit: row.unit || row.Unit || "pcs",
          })).filter((item) => item.code && item.name);

          if (items.length === 0) {
            flash("No valid items found in CSV");
            setIsLoading(false);
            return;
          }

          const res = await fetch(`${API_URL}/api/inventory/bulk-import`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify({ items })
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || errorData.error || "Failed to import CSV");
          }

          const responseData = await res.json();
          flash(responseData.message || "CSV Imported Successfully");
          
          // Refresh list
          fetchInventory();
        } catch (err: any) {
          console.error(err);
          flash(err.message || "Error importing CSV");
          setIsLoading(false);
        }
      },
      error: (err) => {
        console.error(err);
        flash("Failed to parse CSV file");
      }
    });
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ── Flash message ────────────────────────────────────────────────────────
  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  };

  // ── Selection helpers ───────────────────────────────────────────────────
  const toggleItem = (code: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === filtered.length && filtered.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filtered.map((i) => i.code)));
    }
  };

  const allSelected = filtered.length > 0 && selectedItems.size === filtered.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < filtered.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 text-center">
        <div className="inline-block p-4 rounded-lg bg-red-50 text-red-600 border border-red-200">
          <AlertTriangle className="mx-auto mb-2" />
          <p>{error}</p>
          <button 
            onClick={fetchInventory}
            className="mt-4 px-4 py-2 bg-white text-gray-700 rounded border hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-6xl w-full">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-gray-900 text-base md:text-lg" style={{ fontWeight: 700 }}>Inventory</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            {inventory.length} items ·{" "}
            {lowCount > 0 && (
              <span className="text-amber-600">{lowCount} low stock</span>
            )}
            {lowCount > 0 && outCount > 0 && " · "}
            {outCount > 0 && (
              <span className="text-red-600">{outCount} out of stock</span>
            )}
            {lowCount === 0 && outCount === 0 && (
              <span className="text-emerald-600">all stocked</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Flash message */}
          {savedMsg && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-1.5 animate-pulse">
              <Check size={12} /> {savedMsg}
            </span>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Upload size={13} /> Import CSV
          </button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button
            onClick={() => { setShowRestockModal(true); setRestockError(""); setRestockItemCode(""); setRestockAmount(0); }}
            className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            style={{ fontWeight: 500 }}
          >
            <Package size={13} /> Restock
          </button>
          <button
            onClick={() => { setShowAddModal(true); setAddError(""); }}
            className="h-8 px-3 rounded-md bg-gray-900 hover:bg-gray-700 text-white flex items-center gap-1.5 text-sm transition-colors"
            style={{ fontWeight: 500 }}
          >
            <Plus size={13} /> Add item
          </button>
        </div>
      </div>

      {/* ── Alert banner ─────────────────────────────────────────────────────── */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 text-sm">
            {outCount > 0 && <><strong>{outCount} item{outCount !== 1 ? "s" : ""}</strong> out of stock · </>}
            {lowCount > 0 && <><strong>{lowCount} item{lowCount !== 1 ? "s" : ""}</strong> running low — restock soon</>}
          </p>
          <button
            onClick={() => setStatusFilter("Low Stock")}
            className="ml-auto text-xs text-amber-700 underline hover:no-underline"
          >
            View low stock →
          </button>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-gray-300 bg-white focus-within:border-gray-400 transition-colors w-64">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code…"
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`h-8 px-3 rounded-md text-xs transition-colors ${
                activeCategory === cat
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={{ fontWeight: activeCategory === cat ? 600 : 400 }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 ml-auto">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`h-8 px-3 rounded-md text-xs transition-colors ${
                statusFilter === s
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={{ fontWeight: statusFilter === s ? 600 : 400 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        {/* Table header */}
        <table className="w-full text-xs min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                  style={{ accentColor: someSelected || allSelected ? "#111827" : undefined }}
                />
              </th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>
                <span className="flex items-center gap-1">Code <ArrowUpDown size={11} /></span>
              </th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Item name</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Category</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Price</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Min Level</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Qty</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Unit</th>
              <th className="text-left px-4 py-3" style={{ fontWeight: 500 }}>Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                  <Package size={28} className="mx-auto mb-2 opacity-30" />
                  <p>No items match your filters</p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isEditing = editingId === item._id;
                const status = stockStatus(item);
                const isSelected = selectedItems.has(item.code);
                return (
                  <tr
                    key={item._id || item.code}
                    className={`border-b border-gray-50 transition-colors ${
                      isEditing ? "bg-orange-50" : isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItem(item.code)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                        style={{ accentColor: isSelected ? "#111827" : undefined }}
                      />
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3 font-mono text-gray-600" style={{ fontWeight: 600 }}>
                      {item.code}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft!.name}
                          onChange={(e) => setEditDraft({ ...editDraft!, name: e.target.value })}
                          className="h-7 px-2 rounded-md border border-orange-300 text-xs outline-none w-full focus:border-orange-500 bg-white"
                        />
                      ) : (
                        <span className="text-gray-800" style={{ fontWeight: 500 }}>{item.name}</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editDraft!.category}
                          onChange={(e) => setEditDraft({ ...editDraft!, category: e.target.value })}
                          className="h-7 px-1.5 rounded-md border border-orange-300 text-xs outline-none bg-white"
                        >
                          {["Coffee", "Food", "Drinks", "Snacks"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-500">{item.category}</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editDraft!.price}
                            onChange={(e) => setEditDraft({ ...editDraft!, price: Number(e.target.value) })}
                            className="h-7 w-20 px-2 rounded-md border border-orange-300 text-xs outline-none focus:border-orange-500 bg-white"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-900" style={{ fontWeight: 600 }}>${item.price.toFixed(2)}</span>
                      )}
                    </td>

                    {/* Min Level */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft!.lowThreshold}
                          onChange={(e) => setEditDraft({ ...editDraft!, lowThreshold: Number(e.target.value) })}
                          className="h-7 w-20 px-2 rounded-md border border-orange-300 text-xs outline-none focus:border-orange-500 bg-white"
                        />
                      ) : (
                        <span className="text-gray-400 border-b border-dashed border-gray-300 cursor-pointer hover:text-gray-600 transition-colors" style={{ fontWeight: 500 }}>
                          {item.lowThreshold}
                        </span>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          value={editDraft!.stock}
                          onChange={(e) => setEditDraft({ ...editDraft!, stock: Number(e.target.value) })}
                          className="h-7 w-20 px-2 rounded-md border border-orange-300 text-xs outline-none focus:border-orange-500 bg-white"
                        />
                      ) : (
                        <span
                          className={`text-sm ${
                            status === "Out of Stock" ? "text-red-600" : status === "Low Stock" ? "text-amber-600" : "text-gray-900"
                          }`}
                          style={{ fontWeight: 700 }}
                        >
                          {item.stock}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-4 py-3 text-gray-400">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDraft!.unit}
                          onChange={(e) => setEditDraft({ ...editDraft!, unit: e.target.value })}
                          className="h-7 w-20 px-2 rounded-md border border-orange-300 text-xs outline-none bg-white"
                        />
                      ) : (
                        item.unit
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={saveEdit}
                            className="h-7 px-2.5 rounded-md bg-gray-900 text-white flex items-center gap-1 text-xs hover:bg-gray-700 transition-colors"
                            style={{ fontWeight: 600 }}
                          >
                            <Check size={11} /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="h-7 px-2 rounded-md border border-gray-300 text-gray-500 text-xs hover:bg-gray-50"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            title="Edit row"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => deleteItem(item.code)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {inventory.length} items
          </p>
          <p className="text-xs text-gray-400">
            Click <Pencil size={10} className="inline" /> to edit
          </p>
        </div>
      </div>

      {/* ── Add Item Modal ────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Item Code</label>
                <input
                  type="text"
                  value={newItem.code}
                  onChange={(e) => { setNewItem({ ...newItem, code: e.target.value.toUpperCase() }); setAddError(""); }}
                  placeholder="e.g. COF-007"
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none font-mono uppercase focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Americano"
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-md border border-gray-300 text-sm outline-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    {["Coffee", "Food", "Drinks", "Snacks"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Price</label>
                  <div className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-gray-300 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                    <span className="text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={newItem.price || ""}
                      onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Initial Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newItem.stock || ""}
                    onChange={(e) => setNewItem({ ...newItem, stock: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Unit</label>
                  <input
                    type="text"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                    placeholder="e.g. pcs, cups"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Low Stock Threshold</label>
                <input
                  type="number"
                  min={0}
                  value={newItem.lowThreshold || ""}
                  onChange={(e) => setNewItem({ ...newItem, lowThreshold: Number(e.target.value) })}
                  placeholder="10"
                  className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {addError && (
                <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {addError}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={() => { setShowAddModal(false); setAddError(""); setNewItem({ ...emptyNewItem }); }}
                className="flex-1 h-9 px-4 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="flex-1 h-9 px-4 rounded-md bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                style={{ fontWeight: 600 }}
              >
                <Plus size={13} /> Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restock Modal ──────────────────────────────────────────────────────── */}
      {showRestockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowRestockModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {selectedItems.size > 0 ? "Bulk Restock" : "Restock Item"}
              </h3>
              <button onClick={() => { setShowRestockModal(false); setBulkRestockAmounts({}); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {selectedItems.size > 0 ? (
              // Bulk Restock UI
              <div className="space-y-3.5">
                <p className="text-sm text-gray-600">
                  Restocking <strong>{selectedItems.size}</strong> selected item{selectedItems.size !== 1 ? "s" : ""}:
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Array.from(selectedItems).map((code) => {
                    const item = inventory.find((i) => i.code === code);
                    if (!item) return null;
                    return (
                      <div key={code} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                            {item.code} ({item.name})
                          </p>
                          <p className="text-xs text-gray-500">Current: {item.stock} {item.unit}</p>
                        </div>
                        <input
                          type="number"
                          min={0}
                          value={bulkRestockAmounts[code] || ""}
                          onChange={(e) => setBulkRestockAmounts({ ...bulkRestockAmounts, [code]: Number(e.target.value) })}
                          placeholder="0"
                          className="w-20 h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 text-right"
                        />
                      </div>
                    );
                  })}
                </div>

                {restockError && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {restockError}
                  </p>
                )}
              </div>
            ) : (
              // Single Restock UI (legacy)
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Select Item</label>
                  <select
                    value={restockItemCode}
                    onChange={(e) => { setRestockItemCode(e.target.value); setRestockError(""); }}
                    className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Choose an item...</option>
                    {inventory.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} - {item.name} (Current: {item.stock} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Quantity to Add</label>
                  <input
                    type="number"
                    min={1}
                    value={restockAmount || ""}
                    onChange={(e) => { setRestockAmount(Number(e.target.value)); setRestockError(""); }}
                    placeholder="Enter quantity"
                    className="w-full h-9 px-3 rounded-md border border-gray-300 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {restockItemCode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                    <p className="text-blue-800 text-xs">
                      {(() => {
                        const item = inventory.find((i) => i.code === restockItemCode);
                        if (!item) return null;
                        return (
                          <>
                            Current stock: <strong>{item.stock} {item.unit}</strong>
                            {restockAmount > 0 && (
                              <> → New stock: <strong>{item.stock + restockAmount} {item.unit}</strong></>
                            )}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                )}

                {restockError && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {restockError}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowRestockModal(false);
                  setRestockError("");
                  setRestockItemCode("");
                  setRestockAmount(0);
                  setBulkRestockAmounts({});
                }}
                className="flex-1 h-9 px-4 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                style={{ fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                onClick={handleRestock}
                className="flex-1 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors flex items-center justify-center gap-1.5"
                style={{ fontWeight: 600 }}
              >
                <Package size={13} /> Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Action Bar (Floating) ────────────────────────────────────────── */}
      {selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white rounded-lg shadow-2xl px-5 py-3 flex items-center gap-6">
            {/* Left side - Selection count */}
            <p className="text-sm text-white" style={{ fontWeight: 600 }}>
              {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
            </p>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowRestockModal(true);
                  setRestockError("");
                  setRestockItemCode("");
                  setRestockAmount(0);
                }}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors flex items-center gap-1.5"
                style={{ fontWeight: 600 }}
              >
                <Package size={14} /> Restock
              </button>
              <button
                onClick={handleMarkOutOfStock}
                className="h-9 px-4 rounded-lg bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 text-sm transition-colors flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                Mark Out of Stock
              </button>
              <button
                onClick={() => {
                  selectedItems.forEach((code) => deleteItem(code));
                }}
                className="w-9 h-9 rounded-lg hover:bg-red-600/20 text-red-400 hover:text-red-300 transition-colors flex items-center justify-center"
                title="Delete selected items"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
