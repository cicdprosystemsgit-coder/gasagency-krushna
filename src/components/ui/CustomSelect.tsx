"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, Plus } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  searchable?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  searchable = false,
  onAddClick,
  addLabel = "+ Add New...",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  // Reset search when opening/closing
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (opt: CustomSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-800 shadow-xs hover:border-slate-300 transition-all text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
        style={{ minHeight: "42px" }}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className="w-4 h-4 text-slate-400 ml-2 transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/50">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-none text-[12px] text-slate-800 focus:outline-none focus:ring-0 p-0"
              />
            </div>
          )}

          {/* Options List */}
          <ul className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-50/40">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-[12px] text-slate-400 text-center">
                No matches found
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] text-left transition-colors ${
                        opt.disabled
                          ? "text-slate-300 cursor-not-allowed bg-slate-50/20"
                          : isSelected
                          ? "bg-blue-50/50 text-blue-700 font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Add Option Footer */}
          {onAddClick && (
            <div className="border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAddClick();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold text-blue-600 hover:bg-blue-50/80 transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>{addLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
