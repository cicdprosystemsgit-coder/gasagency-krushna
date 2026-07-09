"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarPicker } from "./CalendarPicker";
import { addDays, subDays, format, parseISO, setMonth, setYear, isToday, isYesterday, isTomorrow } from "date-fns";

interface DateNavigationHeaderProps {
  selectedDate: string; // YYYY-MM-DD
  onChange?: (date: string) => void;
}

export function DateNavigationHeader({ selectedDate, onChange }: DateNavigationHeaderProps) {
  const router = useRouter();
  const dateObj = parseISO(selectedDate);

  const handleDateChange = (newDate: string) => {
    if (onChange) {
      onChange(newDate);
    } else {
      router.push(`?date=${newDate}`);
    }
  };

  const handlePrevDay = () => {
    const newDate = subDays(dateObj, 1);
    handleDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const newDate = addDays(dateObj, 1);
    handleDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handleToday = () => {
    handleDateChange(format(new Date(), "yyyy-MM-dd"));
  };

  const handleMonthSelect = (m: number) => {
    const newDate = setMonth(dateObj, m);
    handleDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const handleYearSelect = (y: number) => {
    const newDate = setYear(dateObj, y);
    handleDateChange(format(newDate, "yyyy-MM-dd"));
  };

  const getLabel = () => {
    if (isToday(dateObj)) return "Today";
    if (isYesterday(dateObj)) return "Yesterday";
    if (isTomorrow(dateObj)) return "Tomorrow";
    return format(dateObj, "dd MMM");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Day Navigation: < DynamicLabel > */}
      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm">
        <button
          type="button"
          onClick={handlePrevDay}
          className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition cursor-pointer border-0 bg-transparent flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer border-0 bg-transparent min-w-[64px] text-center"
        >
          {getLabel()}
        </button>
        <button
          type="button"
          onClick={handleNextDay}
          className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition cursor-pointer border-0 bg-transparent flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month Dropdown */}
      <select
        value={dateObj.getMonth()}
        onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={i}>
            {format(new Date(2020, i, 1), "MMMM")}
          </option>
        ))}
      </select>

      {/* Year Dropdown */}
      <select
        value={dateObj.getFullYear()}
        onChange={(e) => handleYearSelect(parseInt(e.target.value))}
        className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

      {/* Popover Calendar Grid Trigger */}
      <CalendarPicker value={selectedDate} onChange={handleDateChange} align="right" />
    </div>
  );
}
