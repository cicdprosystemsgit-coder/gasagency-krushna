"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isAfter,
  isBefore,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
} from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  className?: string;
  align?: "left" | "right";
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className,
  align = "left",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track current month view of the inline calendar
  const initialMonth = dateFrom && isValid(parseISO(dateFrom)) ? parseISO(dateFrom) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  // Sync current month when dateFrom changes externally
  useEffect(() => {
    if (dateFrom && isValid(parseISO(dateFrom))) {
      setCurrentMonth(parseISO(dateFrom));
    }
  }, [dateFrom]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getPresetDates = (preset: "today" | "yesterday" | "7days" | "30days" | "month") => {
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    
    switch (preset) {
      case "today": {
        const localToday = new Date(today.getTime() - tzOffset);
        const dateStr = localToday.toISOString().slice(0, 10);
        return { from: dateStr, to: dateStr };
      }
      case "yesterday": {
        const yesterday = new Date(today.getTime() - tzOffset - 86400000);
        const dateStr = yesterday.toISOString().slice(0, 10);
        return { from: dateStr, to: dateStr };
      }
      case "7days": {
        const fromDate = new Date(today.getTime() - tzOffset - 6 * 86400000);
        const toDate = new Date(today.getTime() - tzOffset);
        return {
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
        };
      }
      case "30days": {
        const fromDate = new Date(today.getTime() - tzOffset - 29 * 86400000);
        const toDate = new Date(today.getTime() - tzOffset);
        return {
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
        };
      }
      case "month": {
        const startOfMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfMonthLocal = new Date(startOfMonthDate.getTime() - tzOffset);
        const todayLocal = new Date(today.getTime() - tzOffset);
        return {
          from: startOfMonthLocal.toISOString().slice(0, 10),
          to: todayLocal.toISOString().slice(0, 10),
        };
      }
    }
  };

  const handlePreset = (preset: "today" | "yesterday" | "7days" | "30days" | "month") => {
    const { from, to } = getPresetDates(preset);
    onChange(from, to);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("", "");
    setIsOpen(false);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = parseISO(dateStr);
    if (!isValid(date)) return "";
    return format(date, "dd MMM yyyy");
  };

  const displayLabel = () => {
    if (!dateFrom && !dateTo) return "All Time";
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return formatDateDisplay(dateFrom);
      return `${formatDateDisplay(dateFrom)} - ${formatDateDisplay(dateTo)}`;
    }
    if (dateFrom) return `From ${formatDateDisplay(dateFrom)}`;
    return `To ${formatDateDisplay(dateTo)}`;
  };

  // Calendar rendering math
  const parsedFrom = dateFrom && isValid(parseISO(dateFrom)) ? parseISO(dateFrom) : null;
  const parsedTo = dateTo && isValid(parseISO(dateTo)) ? parseISO(dateTo) : null;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Chunk days into weeks of 7
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleDateClick = (day: Date) => {
    const clickedStr = format(day, "yyyy-MM-dd");

    if (!dateFrom || (dateFrom && dateTo)) {
      onChange(clickedStr, "");
    } else {
      const fromDate = parseISO(dateFrom);
      if (isBefore(day, fromDate)) {
        onChange(clickedStr, "");
      } else {
        onChange(dateFrom, clickedStr);
      }
    }
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between w-full gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 cursor-pointer min-w-[200px]"
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span>{displayLabel()}</span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        </button>
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-[310px] rounded-2xl bg-white border border-slate-100 shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Quick Presets */}
          <div className="mb-3.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Presets
            </span>
            <div className="grid grid-cols-2 gap-1">
              {[
                { label: "Today", value: "today" },
                { label: "Yesterday", value: "yesterday" },
                { label: "Last 7 Days", value: "7days" },
                { label: "Last 30 Days", value: "30days" },
                { label: "This Month", value: "month" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePreset(preset.value as any)}
                  className="px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50/50 rounded-lg transition cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 my-3" />

          {/* Calendar Picker View */}
          <div className="mb-3.5">
            {/* Header Controls (Month/Year Select and navigation) */}
            <div className="flex items-center justify-between gap-1 mb-3 flex-wrap">
              {/* Today Controller */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1 hover:bg-white rounded text-slate-600 transition cursor-pointer border-0 bg-transparent"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(today);
                  }}
                  className="px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-white rounded transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1 hover:bg-white rounded text-slate-600 transition cursor-pointer border-0 bg-transparent"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Month Dropdown */}
              <select
                value={currentMonth.getMonth()}
                onChange={(e) => {
                  const newMonth = new Date(currentMonth);
                  newMonth.setMonth(parseInt(e.target.value));
                  setCurrentMonth(newMonth);
                }}
                className="px-1.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {format(new Date(2020, i, 1), "MMMM")}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={currentMonth.getFullYear()}
                onChange={(e) => {
                  const newYear = new Date(currentMonth);
                  newYear.setFullYear(parseInt(e.target.value));
                  setCurrentMonth(newYear);
                }}
                className="px-1.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
              >
                {Array.from({ length: 21 }, (_, i) => {
                  const year = new Date().getFullYear() - 10 + i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Weekday Labels (Flex) */}
            <div
              style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}
              className="mb-1.5"
            >
              {weekDays.map((day, idx) => (
                <span
                  key={idx}
                  style={{ width: "32px", textAlign: "center" }}
                  className="text-[10px] font-bold text-slate-400 uppercase"
                >
                  {day}
                </span>
              ))}
            </div>

            {/* Days Grid (Flex Weeks) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {weeks.map((week, weekIdx) => (
                <div
                  key={weekIdx}
                  style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}
                >
                  {week.map((day, dayIdx) => {
                    const isSelectedStart = parsedFrom ? isSameDay(day, parsedFrom) : false;
                    const isSelectedEnd = parsedTo ? isSameDay(day, parsedTo) : false;
                    const isWithinRange =
                      parsedFrom && parsedTo
                        ? isAfter(day, parsedFrom) && isBefore(day, parsedTo)
                        : false;

                    const isCurrentMonth = format(day, "yyyy-MM") === format(currentMonth, "yyyy-MM");

                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => {
                          if (isCurrentMonth) handleDateClick(day);
                        }}
                        style={{
                          width: "32px",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        className={cn(
                          "text-xs rounded-md font-medium transition flex-shrink-0",
                          isCurrentMonth && "cursor-pointer",
                          !isCurrentMonth && "text-slate-300 cursor-not-allowed opacity-40",
                          isCurrentMonth && "text-slate-600 hover:bg-slate-50",
                          isWithinRange && "bg-blue-50 text-blue-700 rounded-none",
                          isSelectedStart && "bg-blue-600 text-white font-semibold rounded-l-md rounded-r-none hover:bg-blue-700",
                          isSelectedEnd && "bg-blue-600 text-white font-semibold rounded-r-md rounded-l-none hover:bg-blue-700",
                          isSelectedStart && !parsedTo && "rounded-md"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 my-3" />

          {/* Footer actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={handleClear}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-transparent border-0"
            >
              <RefreshCw className="w-3 h-3" /> Reset Filter
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer border-0"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
