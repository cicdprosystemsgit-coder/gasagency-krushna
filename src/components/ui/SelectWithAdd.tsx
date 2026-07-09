"use client";

/**
 * SelectWithAdd — a custom dropdown that looks like a native <select>
 * but renders a sticky "+ Add [label]" button at the bottom of the list.
 *
 * Usage:
 *   <SelectWithAdd
 *     value={form.type}
 *     onChange={(val) => setForm({ ...form, type: val })}
 *     options={[
 *       { value: "OTHER",     label: "Other Inventory" },
 *       { value: "REGULATOR", label: "Regulator" },
 *       { value: "PIPE",      label: "Pipe Fitting" },
 *     ]}
 *     addLabel="Type"
 *     onAdd={(newLabel, newValue) => { ... }}
 *   />
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, X, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectWithAddProps {
  /** Currently selected value */
  value: string;
  /** Called when the user picks an option or adds a new one */
  onChange: (value: string) => void;
  /** The list of options to show */
  options: SelectOption[];
  /** Word used in "+ Add [addLabel]" and the mini-form title */
  addLabel?: string;
  /**
   * Called after the user types a new type and clicks "Add".
   * Receives the trimmed label string.
   * If you want to persist it to a DB, fire your action here.
   * The component will optimistically add it to the list immediately.
   */
  onAdd?: (label: string, value: string) => void;
  /** Extra classes for the trigger button */
  className?: string;
  disabled?: boolean;
}

export function SelectWithAdd({
  value,
  onChange,
  options: initialOptions,
  addLabel = "Type",
  onAdd,
  className = "",
  disabled = false,
}: SelectWithAddProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<SelectOption[]>(initialOptions);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep options in sync if parent changes them
  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowAddForm(false);
        setNewLabel("");
        setAddError("");
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Auto-focus the add input when form opens
  useEffect(() => {
    if (showAddForm) setTimeout(() => inputRef.current?.focus(), 50);
  }, [showAddForm]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value ?? "Select…";

  function handleSelect(opt: SelectOption) {
    onChange(opt.value);
    setOpen(false);
    setShowAddForm(false);
  }

  function handleAddSubmit() {
    const trimmed = newLabel.trim();
    if (!trimmed) { setAddError("Please enter a name."); return; }

    // Convert label to a snake_case-like value
    const generatedValue = trimmed.toUpperCase().replace(/\s+/g, "_");

    // Check for duplicates
    if (options.some((o) => o.value === generatedValue || o.label.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("This type already exists.");
      return;
    }

    const newOpt: SelectOption = { value: generatedValue, label: trimmed };
    setOptions((prev) => [...prev, newOpt]);
    onChange(newOpt.value);
    onAdd?.(trimmed, generatedValue);

    setNewLabel("");
    setAddError("");
    setShowAddForm(false);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Trigger ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((v) => !v); setShowAddForm(false); }}
        className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ minHeight: 42 }}
      >
        <span className="text-slate-800 truncate">{selectedLabel}</span>
        <ChevronDown
          className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          style={{ minWidth: 180 }}
        >
          {/* Options list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-blue-50 transition-colors"
                >
                  <span className={opt.value === value ? "font-semibold text-blue-700" : "text-slate-700"}>
                    {opt.label}
                  </span>
                  {opt.value === value && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-4 py-3 text-xs text-slate-400 text-center">No options yet</li>
            )}
          </ul>

          {/* ── Divider + Add Type button / mini-form ── */}
          <div className="border-t border-slate-100">
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add {addLabel}
              </button>
            ) : (
              <div className="p-3 bg-blue-50/60">
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wide mb-2">
                  New {addLabel}
                </p>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newLabel}
                    onChange={(e) => { setNewLabel(e.target.value); setAddError(""); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddSubmit(); }
                      if (e.key === "Escape") { setShowAddForm(false); setNewLabel(""); }
                    }}
                    placeholder={`e.g. Hose Pipe`}
                    className="flex-1 px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubmit}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
                    title="Add"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setNewLabel(""); setAddError(""); }}
                    className="px-2 py-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {addError && (
                  <p className="text-[11px] text-red-600 mt-1.5">{addError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
