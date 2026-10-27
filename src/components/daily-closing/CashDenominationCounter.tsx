"use client";

import { useState, useEffect } from "react";
import { Banknote, Coins, Plus, Trash2, RotateCcw, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface CashDenominationItem {
  id: string;
  denomination: number;
  count: number;
  total: number;
  type: "NOTE" | "COIN" | "CUSTOM";
  label?: string;
  currencySymbol?: string;
}

export const DEFAULT_DENOMINATIONS: CashDenominationItem[] = [
  // Notes
  { id: "note_2000", denomination: 2000, count: 0, total: 0, type: "NOTE", label: "₹2,000", currencySymbol: "₹" },
  { id: "note_500", denomination: 500, count: 0, total: 0, type: "NOTE", label: "₹500", currencySymbol: "₹" },
  { id: "note_200", denomination: 200, count: 0, total: 0, type: "NOTE", label: "₹200", currencySymbol: "₹" },
  { id: "note_100", denomination: 100, count: 0, total: 0, type: "NOTE", label: "₹100", currencySymbol: "₹" },
  { id: "note_50", denomination: 50, count: 0, total: 0, type: "NOTE", label: "₹50", currencySymbol: "₹" },
  { id: "note_20", denomination: 20, count: 0, total: 0, type: "NOTE", label: "₹20", currencySymbol: "₹" },
  { id: "note_10", denomination: 10, count: 0, total: 0, type: "NOTE", label: "₹10", currencySymbol: "₹" },
  // Coins & Small Denominations ("dollers" / coins)
  { id: "coin_5", denomination: 5, count: 0, total: 0, type: "COIN", label: "₹5 Coin", currencySymbol: "₹" },
  { id: "coin_2", denomination: 2, count: 0, total: 0, type: "COIN", label: "₹2 Coin", currencySymbol: "₹" },
  { id: "coin_1", denomination: 1, count: 0, total: 0, type: "COIN", label: "₹1 Coin", currencySymbol: "₹" },
];

interface CashDenominationCounterProps {
  initialDenominations?: CashDenominationItem[] | null;
  onChange?: (denominations: CashDenominationItem[], totalAmount: number) => void;
  readOnly?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

export function CashDenominationCounter({
  initialDenominations,
  onChange,
  readOnly = false,
  className = "",
  defaultExpanded = true,
}: CashDenominationCounterProps) {
  const [denominations, setDenominations] = useState<CashDenominationItem[]>(() => {
    if (initialDenominations && Array.isArray(initialDenominations) && initialDenominations.length > 0) {
      // Merge with defaults to ensure all standard denominations exist, or keep saved ones
      const map = new Map<string, CashDenominationItem>();
      DEFAULT_DENOMINATIONS.forEach((d) => map.set(d.id, { ...d }));
      initialDenominations.forEach((d) => {
        const id = d.id || `${d.type === "COIN" ? "coin" : "note"}_${d.denomination}`;
        map.set(id, {
          ...d,
          id,
          total: (d.denomination || 0) * (d.count || 0),
        });
      });
      return Array.from(map.values());
    }
    return DEFAULT_DENOMINATIONS.map((d) => ({ ...d }));
  });

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customCurrency, setCustomCurrency] = useState("₹");
  const [customType, setCustomType] = useState<"NOTE" | "COIN">("NOTE");

  // Keep denominations synced if parent props change meaningfully
  useEffect(() => {
    if (initialDenominations && Array.isArray(initialDenominations) && initialDenominations.length > 0) {
      const map = new Map<string, CashDenominationItem>();
      DEFAULT_DENOMINATIONS.forEach((d) => map.set(d.id, { ...d }));
      initialDenominations.forEach((d) => {
        const id = d.id || `${d.type === "COIN" ? "coin" : "note"}_${d.denomination}`;
        map.set(id, {
          ...d,
          id,
          total: (d.denomination || 0) * (d.count || 0),
        });
      });
      setDenominations(Array.from(map.values()));
    }
  }, [initialDenominations]);

  const totalCash = denominations.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const totalNotes = denominations
    .filter((d) => d.type === "NOTE")
    .reduce((acc, curr) => acc + (curr.count || 0), 0);
  const totalCoins = denominations
    .filter((d) => d.type !== "NOTE")
    .reduce((acc, curr) => acc + (curr.count || 0), 0);

  const handleCountChange = (id: string, countStr: string) => {
    if (readOnly) return;
    const count = Math.max(0, parseInt(countStr, 10) || 0);
    const updated = denominations.map((d) => {
      if (d.id === id) {
        return {
          ...d,
          count,
          total: d.denomination * count,
        };
      }
      return d;
    });
    setDenominations(updated);
    const newTotal = updated.reduce((acc, curr) => acc + curr.total, 0);
    onChange?.(updated, newTotal);
  };

  const handleStepChange = (id: string, delta: number) => {
    if (readOnly) return;
    const target = denominations.find((d) => d.id === id);
    if (!target) return;
    const newCount = Math.max(0, target.count + delta);
    handleCountChange(id, newCount.toString());
  };

  const handleResetCounts = () => {
    if (readOnly) return;
    const updated = denominations.map((d) => ({
      ...d,
      count: 0,
      total: 0,
    }));
    setDenominations(updated);
    onChange?.(updated, 0);
  };

  const handleAddCustomDenomination = () => {
    const val = parseFloat(customValue);
    if (!val || val <= 0) return;

    const id = `custom_${customType.toLowerCase()}_${val}_${Date.now()}`;
    const newDenom: CashDenominationItem = {
      id,
      denomination: val,
      count: 0,
      total: 0,
      type: "CUSTOM",
      currencySymbol: customCurrency,
      label: `${customCurrency}${val} (${customType === "COIN" ? "Coin/Dollar" : "Note"})`,
    };

    const updated = [...denominations, newDenom];
    setDenominations(updated);
    setCustomValue("");
    setShowAddCustom(false);
    const newTotal = updated.reduce((acc, curr) => acc + curr.total, 0);
    onChange?.(updated, newTotal);
  };

  const handleRemoveDenomination = (id: string) => {
    if (readOnly) return;
    const updated = denominations.filter((d) => d.id !== id);
    setDenominations(updated);
    const newTotal = updated.reduce((acc, curr) => acc + curr.total, 0);
    onChange?.(updated, newTotal);
  };

  // If readOnly and no counts were entered, return a compact summary
  if (readOnly && totalCash === 0) {
    return (
      <div className={`text-xs text-slate-400 italic py-1 ${className}`}>
        No denomination counts recorded.
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-b from-slate-50 to-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all ${className}`}>
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 bg-slate-100/70 border-b border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
            <Banknote className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-xs sm:text-sm">
                Cash Denominations &amp; Notes Count
              </span>
              {totalCash > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Total: {formatCurrency(totalCash)}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500">
              Count currency notes (₹500, ₹100, ₹10...) and coins / dollars
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Counted Notes &amp; Coins</span>
            <span className="text-xs font-black text-slate-700">
              {totalNotes} notes, {totalCoins} coins = {formatCurrency(totalCash)}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 animate-in fade-in duration-150">
          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-blue-600" /> Currency Notes
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Subtotal: {formatCurrency(denominations.filter(d => d.type === "NOTE").reduce((s, d) => s + d.total, 0))} ({totalNotes} notes)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {denominations
                .filter((d) => d.type === "NOTE")
                .map((d) => {
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                        d.count > 0
                          ? "bg-blue-50/50 border-blue-200 shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-14 text-center py-1 rounded-lg text-xs font-black bg-blue-100 text-blue-800">
                          {d.currencySymbol || "₹"}{d.denomination}
                        </span>
                        <span className="text-xs font-medium text-slate-400">×</span>
                      </div>

                      {readOnly ? (
                        <div className="text-right">
                          <span className="font-bold text-xs text-slate-700">{d.count}</span>
                          <span className="block text-[10px] font-black text-blue-700">
                            {formatCurrency(d.total)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepChange(d.id, -1)}
                            disabled={d.count <= 0}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={d.count === 0 ? "" : d.count}
                            onChange={(e) => handleCountChange(d.id, e.target.value)}
                            placeholder="0"
                            className="w-14 text-center py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepChange(d.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition"
                          >
                            +
                          </button>
                          <div className="w-16 text-right">
                            <span className="block text-[11px] font-black text-blue-800">
                              {formatCurrency(d.total)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Coins / Small Denominations / Dollars Section */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-600" /> Coins &amp; Other Denominations / Dollars
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Subtotal: {formatCurrency(denominations.filter(d => d.type !== "NOTE").reduce((s, d) => s + d.total, 0))} ({totalCoins} items)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {denominations
                .filter((d) => d.type !== "NOTE")
                .map((d) => {
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                        d.count > 0
                          ? "bg-amber-50/40 border-amber-200 shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-[3.5rem] px-2 text-center py-1 rounded-lg text-xs font-black bg-amber-100 text-amber-900">
                          {d.currencySymbol || "₹"}{d.denomination}
                        </span>
                        <span className="text-xs font-medium text-slate-400">×</span>
                      </div>

                      {readOnly ? (
                        <div className="text-right">
                          <span className="font-bold text-xs text-slate-700">{d.count}</span>
                          <span className="block text-[10px] font-black text-amber-700">
                            {formatCurrency(d.total)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStepChange(d.id, -1)}
                            disabled={d.count <= 0}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={d.count === 0 ? "" : d.count}
                            onChange={(e) => handleCountChange(d.id, e.target.value)}
                            placeholder="0"
                            className="w-14 text-center py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepChange(d.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition"
                          >
                            +
                          </button>
                          <div className="w-16 text-right">
                            <span className="block text-[11px] font-black text-amber-900">
                              {formatCurrency(d.total)}
                            </span>
                          </div>
                          {d.type === "CUSTOM" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDenomination(d.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                              title="Remove custom denomination"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Add Custom Note / Dollar / Coin Form */}
          {!readOnly && (
            <div className="border-t border-slate-100 pt-3">
              {!showAddCustom ? (
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(true)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Note or Dollar/Coin Denomination
                  </button>

                  {totalCash > 0 && (
                    <button
                      type="button"
                      onClick={handleResetCounts}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Counts
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Add Custom Note / Dollar / Coin
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
                      <select
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value as "NOTE" | "COIN")}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 bg-white"
                      >
                        <option value="NOTE">💵 Currency Note</option>
                        <option value="COIN">🪙 Coin / Dollar</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency Symbol</label>
                      <select
                        value={customCurrency}
                        onChange={(e) => setCustomCurrency(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 bg-white"
                      >
                        <option value="₹">₹ (INR Rupee)</option>
                        <option value="$">$ (USD Dollar)</option>
                        <option value="€">€ (Euro)</option>
                        <option value="£">£ (Pound)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Denomination Value</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="e.g. 50, 100, 1000"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold text-slate-700 bg-white"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddCustomDenomination}
                        disabled={!customValue || parseFloat(customValue) <= 0}
                        className="w-full py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg transition disabled:opacity-50 text-xs"
                      >
                        Add Denomination
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Summary Bar */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl">
            <div className="text-xs">
              <span className="text-blue-900 font-bold block sm:inline mr-2">Calculated Total Cash:</span>
              <span className="text-blue-700 font-semibold text-[11px]">
                {totalNotes} notes &amp; {totalCoins} coins counted
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-blue-900 tracking-tight">
                {formatCurrency(totalCash)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
