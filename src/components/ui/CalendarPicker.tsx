"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
} from "date-fns";
import { cn } from "@/lib/utils";

interface CalendarPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
  align?: "left" | "right";
  placeholder?: string;
}

export function CalendarPicker({
  value,
  onChange,
  className,
  align = "left",
  placeholder = "Select Date",
}: CalendarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track displayed month/year
  const initialDate = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);

  // Sync displayed month/year with selected value externally
  useEffect(() => {
    if (value && isValid(parseISO(value))) {
      setCurrentMonth(parseISO(value));
    }
  }, [value]);

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

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateSelect = (date: Date) => {
    const formatted = format(date, "yyyy-MM-dd");
    onChange(formatted);
    setIsOpen(false);
  };

  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;
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

  const displayLabel = () => {
    if (!value) return placeholder;
    const date = parseISO(value);
    if (!isValid(date)) return placeholder;
    return format(date, "dd MMM yyyy");
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between w-full gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 cursor-pointer min-w-[150px]"
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
            "absolute z-50 mt-1.5 w-[280px] rounded-2xl bg-white border border-slate-100 shadow-xl p-3.5 animate-in fade-in slide-in-from-top-2 duration-200",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Simple Month/Year Label & Nav */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer border-0 bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition cursor-pointer border-0 bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
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
                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                  const isCurrentMonth = format(day, "yyyy-MM") === format(currentMonth, "yyyy-MM");
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      onClick={() => {
                        if (isCurrentMonth) handleDateSelect(day);
                      }}
                      style={{
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      className={cn(
                        "text-xs rounded-lg font-medium transition flex-shrink-0",
                        isCurrentMonth && "cursor-pointer",
                        !isCurrentMonth && "text-slate-300 cursor-not-allowed opacity-40",
                        isCurrentMonth && !isSelected && "text-slate-600 hover:bg-slate-50",
                        isToday && !isSelected && "border border-blue-200 bg-blue-50/30 text-blue-700",
                        isSelected && "bg-blue-600 text-white font-semibold hover:bg-blue-700"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-2 mt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(format(today, "yyyy-MM-dd"));
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-transparent border-0 cursor-pointer"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
