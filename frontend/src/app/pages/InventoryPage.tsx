import { useState, useMemo } from "react";
import {
  Search, Plus, Pencil, Check, X, Trash2, Package,
  AlertTriangle, ChevronDown, ArrowUpDown, Upload,
} from "lucide-react";

// ─── Data types ──────────────────────────────────────────────────────────────
interface InventoryItem {
  code: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  lowThreshold: number;
  unit: string;
}

// ─── Initial data ─────────────────────────────────────────────────────────────
const initialInventory: InventoryItem[] = [
  { code: "COF-001", name: "Espresso", category: "Coffee", price: 3.50, stock: 45, lowThreshold: 20, unit: "servings" },
  { code: "COF-002", name: "Latte", category: "Coffee", price: 4.80, stock: 12, lowThreshold: 30, unit: "servings" },
  { code: "COF-003", name: "Cappuccino", category: "Coffee", price: 4.20, stock: 0, lowThreshold: 15, unit: "servings" },
  { code: "COF-004", name: "Flat White", category: "Coffee", price: 4.50, stock: 30, lowThreshold: 15, unit: "servings" },
  { code: "COF-005", name: "Cold Brew", category: "Coffee", price: 5.00, stock: 22, lowThreshold: 10, unit: "servings" },
  { code: "COF-006", name: "Almond Milk Latte", category: "Coffee", price: 5.80, stock: 20, lowThreshold: 10, unit: "servings" },
  { code: "FOD-001", name: "Blueberry Muffin", category: "Food", price: 3.20, stock: 18, lowThreshold: 10, unit: "pcs" },
  { code: "FOD-002", name: "Croissant", category: "Food", price: 3.80, stock: 12, lowThreshold: 10, unit: "pcs" },
  { code: "FOD-003", name: "Bagel", category: "Food", price: 2.90, stock: 25, lowThreshold: 10, unit: "pcs" },
  { code: "FOD-004", name: "Danish", category: "Food", price: 3.50, stock: 5, lowThreshold: 8, unit: "pcs" },
  { code: "DRK-001", name: "Iced Tea", category: "Drinks", price: 3.00, stock: 60, lowThreshold: 15, unit: "bottles" },
  { code: "DRK-002", name: "Fresh Juice", category: "Drinks", price: 4.50, stock: 15, lowThreshold: 12, unit: "bottles" },
  { code: "DRK-003", name: "Smoothie", category: "Drinks", price: 5.50, stock: 10, lowThreshold: 8, unit: "cups" },
  { code: "SNK-001", name: "Granola Bar", category: "Snacks", price: 2.50, stock: 40, lowThreshold: 15, unit: "pcs" },
  { code: "SNK-002", name: "Chips", category: "Snacks", price: 1.80, stock: 55, lowThreshold: 20, unit: "bags" },
  { code: "SNK-003", name: "Chocolate", category: "Snacks", price: 2.20, stock: 30, lowThreshold: 15, unit: "bars" },
];

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
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [editingCode, setEditingCode] = useState<string | null>(null);
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set([initialInventory[1].code, initialInventory[2].code]));
  const [bulkRestockAmounts, setBulkRestockAmounts] = useState<Record<string, number>>({});

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
    setEditingCode(item.code);
    setEditDraft({ ...item });
  };

  const saveEdit = () => {
    if (!editDraft) return;
    setInventory((prev) => prev.map((i) => (i.code === editDraft.code ? editDraft : i)));
    setEditingCode(null);
    setEditDraft(null);
    flash(`${editDraft.name} updated`);
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditDraft(null);
  };

  const deleteItem = (code: string) => {
    const item = inventory.find((i) => i.code === code);
    setInventory((prev) => prev.filter((i) => i.code !== code));
    if (item) flash(`${item.name} removed`);
  };

  // ── Restock helpers ──────────────────────────────────────────────────────
  const handleRestock = () => {
    // Check if we're doing bulk restock (selectedItems) or single restock
    if (selectedItems.size > 0) {
      // Bulk restock
      let restockedCount = 0;
      setInventory((prev) =>
        prev.map((item) => {
          if (selectedItems.has(item.code)) {
            const amount = bulkRestockAmounts[item.code] || 0;
            if (amount > 0) {
              restockedCount++;
              return { ...item, stock: item.stock + amount };
            }
          }
          return item;
        })
      );
      if (restockedCount > 0) {
        flash(`Restocked ${restockedCount} item${restockedCount !== 1 ? "s" : ""}`);
      }
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
      setInventory((prev) =>
        prev.map((i) =>
          i.code === restockItemCode ? { ...i, stock: i.stock + restockAmount } : i
        )
      );
      const item = inventory.find((i) => i.code === restockItemCode);
      if (item) flash(`Added ${restockAmount} ${item.unit} to ${item.name}`);
      setShowRestockModal(false);
      setRestockItemCode("");
      setRestockAmount(0);
      setRestockError("");
    }
  };

  // ── Add new item ────────────────────────────────────────────────────────────
  const handleAddItem = () => {
    if (!newItem.code.trim()) { setAddError("Item code is required"); return; }
    if (!newItem.name.trim()) { setAddError("Name is required"); return; }
    if (inventory.find((i) => i.code.toUpperCase() === newItem.code.toUpperCase())) {
      setAddError("Item code already exists");
      return;
    }
    setInventory((prev) => [
      { ...newItem, code: newItem.code.toUpperCase() },
      ...prev,
    ]);
    flash(`${newItem.name} added to inventory`);
    setNewItem({ ...emptyNewItem });
    setShowAddModal(false);
    setAddError("");
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
            className="h-8 px-3 rounded-md border border-gray-300 bg-white flex items-center gap-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Upload size={13} /> Import CSV
          </button>
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
                const isEditing = editingCode === item.code;
                const status = stockStatus(item);
                const isSelected = selectedItems.has(item.code);
                return (
                  <tr
                    key={item.code}
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
                onClick={() => {
                  // Mark selected items as out of stock
                  setInventory((prev) =>
                    prev.map((item) =>
                      selectedItems.has(item.code) ? { ...item, stock: 0 } : item
                    )
                  );
                  flash(`Marked ${selectedItems.size} item${selectedItems.size !== 1 ? "s" : ""} as out of stock`);
                  setSelectedItems(new Set());
                }}
                className="h-9 px-4 rounded-lg bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 text-sm transition-colors flex items-center gap-1.5"
                style={{ fontWeight: 500 }}
              >
                Mark Out of Stock
              </button>
              <button
                onClick={() => {
                  selectedItems.forEach((code) => deleteItem(code));
                  setSelectedItems(new Set());
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
