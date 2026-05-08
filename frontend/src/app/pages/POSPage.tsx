import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, Minus, X, CreditCard, Smartphone,
  Banknote, CheckCircle, RotateCcw, Receipt, Hash,
  ShoppingBag, Loader2, AlertCircle
} from "lucide-react";
import api from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Product {
  _id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface CartItem {
  code: string;
  name: string;
  category: string;
  price: number;
  qty: number;
}

type PaymentMethod = "Card" | "Tap" | "Cash";

const TAX_RATE = 0.08;

const catEmoji: Record<string, string> = {
  Coffee: "☕", Food: "🥐", Drinks: "🥤", Snacks: "🍫",
};

// ─── Component ────────────────────────────────────────────────────────────────
export function POSPage() {
  const [inventory, setInventory] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Card");
  const [charged, setCharged] = useState(false);
  const [discountPct, setDiscountPct] = useState(0);
  const [note, setNote] = useState("");
  const [billNo, setBillNo] = useState<number | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // 1. Fetch live inventory & bill number
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [invData, billData] = await Promise.all([
          api.get<Product[]>("/api/inventory"),
          api.get<{ nextBillNo: number }>("/api/pos/next-bill-no")
        ]);
        setInventory(Array.isArray(invData) ? invData : []);
        setBillNo(billData.nextBillNo);
      } catch (err) {
        setError("Failed to load POS data");
        setInventory([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── Dropdown items ──────────────────────────────────────────────────────
  const dropdownItems = Array.isArray(inventory)
    ? inventory.filter(
        (p) =>
          !search.trim() ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.code.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // ── Cart helpers ────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (product.stock === 0) return;
    
    // Check if adding another one exceeds stock
    const existing = cart.find(i => i.code === product.code);
    if (existing && existing.qty >= product.stock) {
      setError(`Only ${product.stock} units of ${product.name} available.`);
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((i) =>
          i.code === product.code ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [
        ...prev,
        { code: product.code, name: product.name, category: product.category, price: product.price, qty: 1 },
      ];
    });
    setSearch("");
    setError("");
    setShowDropdown(false);
    searchRef.current?.focus();
  };

  const handleSearchSubmit = () => {
    const trimmed = search.trim();
    if (!trimmed) {
      setShowDropdown(true);
      searchRef.current?.focus();
      return;
    }
    const byCode = inventory.find((p) => p.code.toLowerCase() === trimmed.toLowerCase());
    if (byCode) { addToCart(byCode); return; }
    if (dropdownItems.length > 0) { addToCart(dropdownItems[0]); return; }
    setError(`No item found for "${trimmed}"`);
  };

  const updateQty = (code: string, delta: number) => {
    const product = inventory.find(p => p.code === code);
    if (!product) return;

    setCart((prev) => {
      const item = prev.find(i => i.code === code);
      if (item && delta > 0 && item.qty >= product.stock) {
        setError(`Insufficient stock for ${product.name}`);
        return prev;
      }
      setError("");
      return prev
        .map((i) => (i.code === code ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0);
    });
  };

  const removeItem = (code: string) => setCart((prev) => prev.filter((i) => i.code !== code));

  const clearBill = () => {
    setCart([]);
    setCharged(false);
    setDiscountPct(0);
    setNote("");
    setError("");
    // Re-fetch inventory & next bill no to get latest state
    Promise.all([
      api.get<Product[]>("/api/inventory"),
      api.get<{ nextBillNo: number }>("/api/pos/next-bill-no")
    ]).then(([invData, billData]) => {
      setInventory(Array.isArray(invData) ? invData : []);
      setBillNo(billData.nextBillNo);
    });
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  // ── Checkout ────────────────────────────────────────────────────────────
  const handleCharge = async () => {
    if (cart.length === 0) return;
    try {
      setProcessing(true);
      setError("");
      const response = await api.post<{ nextBillNo: number }>("/api/pos/checkout", {
        billNo,
        items: cart,
        subtotal,
        discountPct,
        discountAmt,
        tax,
        total,
        paymentMethod,
        note
      });
      setCharged(true);
      if (response.nextBillNo) setBillNo(response.nextBillNo);
    } catch (err: any) {
      setError(err.message || "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  // ── Totals ──────────────────────────────────────────────────────────────
  const subtotal     = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt  = subtotal * (discountPct / 100);
  const afterDisc    = subtotal - discountAmt;
  const tax          = afterDisc * TAX_RATE;
  const total        = afterDisc + tax;

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* ── Top header bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 md:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Receipt size={16} className="text-orange-500" />
          </div>
          <div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>
              Bill <span className="text-orange-500">#{billNo}</span>
            </p>
            <p className="text-gray-400 hidden sm:block" style={{ fontSize: 11 }}>
              Jane Doe · Morning Shift · {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
        {!charged && cart.length > 0 && (
          <button
            onClick={clearBill}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-md px-2.5 py-1.5 transition-colors"
          >
            <RotateCcw size={12} /> <span className="hidden sm:inline">Clear bill</span>
          </button>
        )}
      </div>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
          <Loader2 size={32} className="animate-spin text-orange-500 mb-2" />
          <p className="text-gray-500 text-sm">Loading inventory...</p>
        </div>
      ) : charged ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 max-w-sm w-full mx-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={34} className="text-emerald-500" />
            </div>
            <p className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>Payment received!</p>
            <p className="text-4xl text-emerald-600 mt-2 mb-1" style={{ fontWeight: 800 }}>${total.toFixed(2)}</p>
            <p className="text-gray-400 text-sm">
              {paymentMethod} · Bill #{billNo} · {cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}
            </p>
            {note && (
              <p className="mt-2 text-gray-500 text-xs italic">Note: {note}</p>
            )}
            <div className="mt-6 space-y-2">
              <button className="w-full h-9 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors" style={{ fontWeight: 500 }}>
                🖨 Print receipt
              </button>
              <button className="w-full h-9 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors" style={{ fontWeight: 500 }}>
                📧 Email receipt
              </button>
              <button
                onClick={clearBill}
                className="w-full h-11 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm transition-colors mt-2"
                style={{ fontWeight: 700 }}
              >
                + Start new bill
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {/* ── LEFT MAIN: Item list ──────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search / add bar */}
            <div className="px-3 md:px-6 pt-5 pb-4 flex-shrink-0" ref={dropdownRef}>
              <p className="text-gray-500 text-xs mb-2" style={{ fontWeight: 500 }}>
                Add item to bill
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div
                    className={`flex items-center gap-2 h-11 px-3 rounded-xl border bg-white transition-all ${
                      error
                        ? "border-red-300 ring-2 ring-red-100"
                        : showDropdown && dropdownItems.length > 0
                        ? "border-orange-400 ring-2 ring-orange-100"
                        : "border-gray-300 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100"
                    }`}
                  >
                    <Search size={15} className="text-gray-400 flex-shrink-0" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      autoFocus
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setError("");
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchSubmit();
                        if (e.key === "Escape") { setSearch(""); setShowDropdown(false); }
                      }}
                      placeholder="Search by item name or code — e.g. Latte, COF-002…"
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
                    />
                    {search && (
                      <button
                        onClick={() => { setSearch(""); setError(""); setShowDropdown(false); }}
                        className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden flex flex-col max-h-72">
                      <div className="overflow-y-auto flex-1">
                        {dropdownItems.length === 0 ? (
                          <div className="px-4 py-3 text-gray-400 text-sm">
                            No items match "<span className="text-gray-700">{search}</span>"
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {dropdownItems.map((p, idx) => (
                              <button
                                key={p.code}
                                onMouseDown={() => addToCart(p)}
                                disabled={p.stock === 0}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                  p.stock === 0
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-orange-50"
                                } ${idx !== 0 ? "border-t border-gray-50" : ""}`}
                              >
                                <span className="text-lg flex-shrink-0">{catEmoji[p.category] ?? "📦"}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>{p.name}</p>
                                  <p className="text-gray-400 text-xs">{p.code} · {p.category}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</p>
                                  {p.stock === 0 && <p className="text-red-400 text-xs">Out of stock</p>}
                                  {p.stock > 0 && p.stock <= 10 && <p className="text-amber-500 text-xs">Low: {p.stock}</p>}
                                </div>
                                {p.stock > 0 && (
                                  <Plus size={15} className="text-orange-400 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex-shrink-0">
                        <p className="text-xs text-gray-400">
                          {search.trim() ? "Press Enter to add top result" : "Select an item from your inventory"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSearchSubmit}
                  className="h-11 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm transition-colors flex items-center gap-2 flex-shrink-0"
                  style={{ fontWeight: 600 }}
                >
                  <Plus size={15} /> Add
                </button>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 mt-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-600 text-xs leading-relaxed" style={{ fontWeight: 500 }}>
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Item table */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center pb-10">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <ShoppingBag size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Bill is empty</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Search by item name or code above to add items
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-gray-400 max-w-xs">
                    <div className="bg-white border border-dashed border-gray-200 rounded-lg p-2.5 text-left">
                      <p className="text-gray-600 mb-0.5" style={{ fontWeight: 600 }}>By name</p>
                      <p>Type "Latte" or "Muffin"</p>
                    </div>
                    <div className="bg-white border border-dashed border-gray-200 rounded-lg p-2.5 text-left">
                      <p className="text-gray-600 mb-0.5" style={{ fontWeight: 600 }}>By item code</p>
                      <p>Type "COF-001" + Enter</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Table head */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_auto_1fr_32px] items-center px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-500" style={{ fontWeight: 500 }}>
                    <span>Item</span>
                    <span>Code</span>
                    <span>Unit price</span>
                    <span className="text-center px-3">Qty</span>
                    <span className="text-right">Line total</span>
                    <span />
                  </div>

                  {/* Rows */}
                  {cart.map((item, idx) => (
                    <div
                      key={item.code}
                      className={`grid grid-cols-[2fr_1fr_1fr_auto_1fr_32px] items-center px-4 py-3 group transition-colors hover:bg-gray-50 ${
                        idx !== 0 ? "border-t border-gray-50" : ""
                      }`}
                    >
                      {/* Name + category */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base flex-shrink-0">{catEmoji[item.category] ?? "📦"}</span>
                        <div className="min-w-0">
                          <p className="text-gray-800 text-sm truncate" style={{ fontWeight: 600 }}>{item.name}</p>
                          <p className="text-gray-400 text-xs">{item.category}</p>
                        </div>
                      </div>

                      {/* Code */}
                      <span className="text-gray-400 text-xs font-mono">{item.code}</span>

                      {/* Unit price */}
                      <span className="text-gray-600 text-sm">${item.price.toFixed(2)}</span>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-2 px-3">
                        <button
                          onClick={() => updateQty(item.code, -1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Minus size={12} className="text-gray-600" />
                        </button>
                        <span className="w-6 text-center text-gray-900 text-sm" style={{ fontWeight: 700 }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.code, 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                        >
                          <Plus size={12} className="text-gray-600" />
                        </button>
                      </div>

                      {/* Line total */}
                      <span className="text-right text-gray-900 text-sm" style={{ fontWeight: 700 }}>
                        ${(item.price * item.qty).toFixed(2)}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(item.code)}
                        className="flex items-center justify-center w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Table footer totals row */}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
                    <span className="text-xs text-gray-400">{cart.reduce((s, i) => s + i.qty, 0)} item{cart.reduce((s, i) => s + i.qty, 0) !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Totals + payment (Desktop Only) ───────────────────────────────── */}
          <div className="hidden md:flex md:flex-col w-full md:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-200 bg-white overflow-y-auto">

            {/* Single continuous vertical stack - ALL elements scroll together */}
            <div className="px-5 py-4 space-y-4">

              {/* Discount */}
              <div>
                <label className="text-xs text-gray-500 block mb-1" style={{ fontWeight: 500 }}>
                  Discount
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-gray-50 focus-within:border-orange-300 transition-colors">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPct || ""}
                      onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                      placeholder="0"
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none w-12"
                    />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                  {discountPct > 0 && (
                    <span className="text-emerald-600 text-xs" style={{ fontWeight: 600 }}>
                      −${discountAmt.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Order note */}
              <div>
                <label className="text-xs text-gray-500 block mb-1" style={{ fontWeight: 500 }}>
                  Order note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. no sugar, allergen note…"
                  rows={2}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 outline-none placeholder-gray-400 focus:border-orange-300 transition-colors resize-none"
                />
              </div>

              {/* Totals breakdown */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="text-gray-700" style={{ fontWeight: 500 }}>${subtotal.toFixed(2)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({discountPct}%)</span>
                    <span style={{ fontWeight: 500 }}>−${discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax (8%)</span>
                  <span className="text-gray-700" style={{ fontWeight: 500 }}>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-gray-100 mt-1">
                  <span className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Total</span>
                  <span className="text-gray-900 text-xl" style={{ fontWeight: 800 }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { method: "Card" as PaymentMethod, icon: CreditCard, label: "Card" },
                      { method: "Tap"  as PaymentMethod, icon: Smartphone, label: "Tap"  },
                      { method: "Cash" as PaymentMethod, icon: Banknote,   label: "Cash" },
                    ] as const
                  ).map(({ method, icon: Icon, label }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                        paymentMethod === method
                          ? "border-orange-400 bg-orange-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <Icon size={15} className={paymentMethod === method ? "text-orange-500" : "text-gray-400"} />
                      <span
                        className={`${paymentMethod === method ? "text-orange-600" : "text-gray-500"}`}
                        style={{ fontWeight: 500, fontSize: 10 }}
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Charge button */}
              <button
                onClick={handleCharge}
                disabled={cart.length === 0 || processing}
                className={`w-full h-14 rounded-xl text-base transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0 || processing
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-700 text-white shadow-md hover:shadow-lg"
                }`}
                style={{ fontWeight: 700 }}
              >
                {processing && <Loader2 size={18} className="animate-spin" />}
                {processing ? "Processing..." : cart.length === 0 ? "Add items to charge" : `Charge $${total.toFixed(2)}`}
              </button>

            </div>
          </div>

        </div>
      )}

      {/* ── MOBILE: Floating Cart Button (when not charged) ───────────────── */}
      {!charged && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pointer-events-none">
          <button
            onClick={() => setShowMobileCart(true)}
            className="w-full h-14 rounded-xl bg-gray-900 hover:bg-gray-700 text-white shadow-lg flex items-center justify-between px-5 pointer-events-auto"
            style={{ fontWeight: 700 }}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span>View Cart</span>
              {cart.length > 0 && (
                <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <span className="text-lg">${total.toFixed(2)}</span>
            )}
          </button>
        </div>
      )}

      {/* ── MOBILE: Cart Bottom Sheet Overlay ───────────────────────────── */}
      {showMobileCart && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowMobileCart(false)}
          />

          {/* Bottom Sheet */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-[85vh] bg-white z-50 rounded-t-2xl overflow-hidden flex flex-col">
            {/* Swipe indicator */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-gray-900 text-base" style={{ fontWeight: 700 }}>
                Cart ({cart.reduce((s, i) => s + i.qty, 0)} items)
              </h3>
              <button
                onClick={() => setShowMobileCart(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Discount */}
              <div>
                <label className="text-xs text-gray-500 block mb-1" style={{ fontWeight: 500 }}>
                  Discount
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 h-8 px-2.5 rounded-lg border border-gray-200 bg-gray-50 focus-within:border-orange-300 transition-colors">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPct || ""}
                      onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                      placeholder="0"
                      className="flex-1 bg-transparent text-sm text-gray-800 outline-none w-12"
                    />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                  {discountPct > 0 && (
                    <span className="text-emerald-600 text-xs" style={{ fontWeight: 600 }}>
                      −${discountAmt.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Order note */}
              <div>
                <label className="text-xs text-gray-500 block mb-1" style={{ fontWeight: 500 }}>
                  Order note
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. no sugar, allergen note…"
                  rows={2}
                  className="w-full px-2.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-700 outline-none placeholder-gray-400 focus:border-orange-300 transition-colors resize-none"
                />
              </div>

              {/* Totals breakdown */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="text-gray-700" style={{ fontWeight: 500 }}>${subtotal.toFixed(2)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({discountPct}%)</span>
                    <span style={{ fontWeight: 500 }}>−${discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax (8%)</span>
                  <span className="text-gray-700" style={{ fontWeight: 500 }}>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-gray-100 mt-1">
                  <span className="text-gray-900 text-base" style={{ fontWeight: 700 }}>Total</span>
                  <span className="text-gray-900 text-xl" style={{ fontWeight: 800 }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500" style={{ fontWeight: 500 }}>Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { method: "Card" as PaymentMethod, icon: CreditCard, label: "Card" },
                      { method: "Tap"  as PaymentMethod, icon: Smartphone, label: "Tap"  },
                      { method: "Cash" as PaymentMethod, icon: Banknote,   label: "Cash" },
                    ] as const
                  ).map(({ method, icon: Icon, label }) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                        paymentMethod === method
                          ? "border-orange-400 bg-orange-50 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <Icon size={15} className={paymentMethod === method ? "text-orange-500" : "text-gray-400"} />
                      <span
                        className={`${paymentMethod === method ? "text-orange-600" : "text-gray-500"}`}
                        style={{ fontWeight: 500, fontSize: 10 }}
                      >
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Charge button */}
              <button
                onClick={async () => {
                  if (cart.length > 0) {
                    await handleCharge();
                    if (!error) setShowMobileCart(false);
                  }
                }}
                disabled={cart.length === 0 || processing}
                className={`w-full h-14 rounded-xl text-base transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0 || processing
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 hover:bg-gray-700 text-white shadow-md hover:shadow-lg"
                }`}
                style={{ fontWeight: 700 }}
              >
                {processing && <Loader2 size={18} className="animate-spin" />}
                {processing ? "Processing..." : cart.length === 0 ? "Add items to charge" : `Charge $${total.toFixed(2)}`}
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
