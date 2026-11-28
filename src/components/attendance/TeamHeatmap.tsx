"use client";

import { useState } from "react";
import { Coffee, UserCheck, Calendar, UserX } from "lucide-react";

type Employee = { id: string; name: string; role: string };
type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: Date | string;
  status: string;
};

interface Props {
  employees: Employee[];
  records: AttendanceRecord[];
  month: number;
  year: number;
}

const STATUS_SHORTHANDS: Record<string, { label: string; color: string; text: string }> = {
  PRESENT: { label: "P", color: "bg-emerald-500", text: "text-white" },
  ABSENT: { label: "A", color: "bg-red-500", text: "text-white" },
  HALF_DAY: { label: "H", color: "bg-amber-500", text: "text-white" },
  ON_LEAVE: { label: "L", color: "bg-sky-500", text: "text-white" },
  HOLIDAY: { label: "H", color: "bg-purple-500", text: "text-white" },
};

export function TeamHeatmap({ employees, records, month, year }: Props) {
  const totalDays = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Helper to find status
  const getStatus = (employeeId: string, day: number): string | null => {
    const match = records.find((r) => {
      const d = new Date(r.date);
      return d.getDate() === day && d.getMonth() === month - 1 && d.getFullYear() === year && r.employeeId === employeeId;
    });
    if (match) return match.status;

    // If today and not punched in yet, show as ABSENT until they punch in
    const now = new Date();
    if (day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()) {
      return "ABSENT";
    }

    return null;
  };

  // Compute daily presence percentage
  const getDailyPercent = (day: number) => {
    let present = 0;
    let count = 0;
    employees.forEach((emp) => {
      const status = getStatus(emp.id, day);
      if (status) {
        count++;
        if (status === "PRESENT") present++;
        else if (status === "HALF_DAY") present += 0.5;
      }
    });
    return count > 0 ? Math.round((present / count) * 100) : 0;
  };

  // Compute monthly attendance % for an employee
  const getEmployeeMonthlyPercent = (employeeId: string) => {
    let present = 0;
    let marked = 0;
    dayNumbers.forEach((day) => {
      const status = getStatus(employeeId, day);
      if (status) {
        marked++;
        if (status === "PRESENT") present++;
        else if (status === "HALF_DAY") present += 0.5;
        else if (status === "ON_LEAVE" || status === "HOLIDAY") present++; // Counted as working/paid days
      }
    });
    return marked > 0 ? Math.round((present / marked) * 100) : 100;
  };

  return (
    <div className="card p-6 border border-zinc-100 shadow-sm bg-white overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-800">Team Month-at-a-Glance Heatmap</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Visual checklist of daily attendance records</p>
        </div>
        
        {/* Heatmap Legend */}
        <div className="flex gap-3 text-[11px] font-semibold text-zinc-600">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Present</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Half Day</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Absent</div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-sky-500" /> Leave</div>
        </div>
      </div>

      {/* Mobile Vertical Summary (< 768px) */}
      <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
        {employees.map((emp) => {
          const present = dayNumbers.filter((d) => getStatus(emp.id, d) === "PRESENT").length;
          const half = dayNumbers.filter((d) => getStatus(emp.id, d) === "HALF_DAY").length;
          const absent = dayNumbers.filter((d) => getStatus(emp.id, d) === "ABSENT").length;
          const leave = dayNumbers.filter((d) => getStatus(emp.id, d) === "ON_LEAVE").length;
          const totalMarked = present + half + absent + leave;
          const pct = totalMarked > 0 ? Math.round(((present + half * 0.5) / totalMarked) * 100) : 0;
          return (
            <div key={`mob-hm-${emp.id}`} className="py-3 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <span className="font-bold text-zinc-800 dark:text-zinc-100 truncate">{emp.name}</span>
                </div>
                <span className="font-bold text-blue-600 shrink-0">{pct}%</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
                <div className="rounded py-1 bg-emerald-50 text-emerald-700 font-semibold">P: {present}</div>
                <div className="rounded py-1 bg-amber-50 text-amber-700 font-semibold">H: {half}</div>
                <div className="rounded py-1 bg-red-50 text-red-700 font-semibold">A: {absent}</div>
                <div className="rounded py-1 bg-sky-50 text-sky-700 font-semibold">L: {leave}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full border-collapse border border-zinc-100">
          <thead>
            <tr className="bg-zinc-50/50">
              <th className="sticky left-0 bg-white border border-zinc-100 p-2 text-left text-xs font-bold text-zinc-500 min-w-[150px] z-10">
                Employee
              </th>
              {dayNumbers.map((day) => (
                <th key={`h-${day}`} className="border border-zinc-100 p-1 text-center text-[10px] font-bold text-zinc-500 min-w-[28px]">
                  {day}
                </th>
              ))}
              <th className="border border-zinc-100 p-2 text-center text-xs font-bold text-zinc-500 min-w-[60px]">
                Month %
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-zinc-50/30">
                <td className="sticky left-0 bg-white border border-zinc-100 p-2 text-xs font-bold text-zinc-800 flex items-center gap-1.5 z-10">
                  <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  <span className="truncate max-w-[120px]" title={emp.name}>{emp.name}</span>
                </td>
                {dayNumbers.map((day) => {
                  const status = getStatus(emp.id, day);
                  const sh = status ? STATUS_SHORTHANDS[status] : null;

                  return (
                    <td key={`c-${emp.id}-${day}`} className="border border-zinc-100 p-0.5 text-center">
                      {sh ? (
                        <div
                          className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[10px] font-bold ${sh.color} ${sh.text} transition hover:scale-105 cursor-help`}
                          title={`${emp.name} - Day ${day}: ${sh.label}`}
                        >
                          {sh.label}
                        </div>
                      ) : (
                        <div className="w-6 h-6 mx-auto rounded bg-zinc-50 border border-zinc-100" />
                      )}
                    </td>
                  );
                })}
                <td className="border border-zinc-100 p-2 text-center text-xs font-extrabold text-zinc-700">
                  {getEmployeeMonthlyPercent(emp.id)}%
                </td>
              </tr>
            ))}
            
            {/* Daily % Summary Row */}
            <tr className="bg-zinc-50/40">
              <td className="sticky left-0 bg-zinc-50 border border-zinc-100 p-2 text-xs font-extrabold text-zinc-600 z-10">
                Daily Summary %
              </td>
              {dayNumbers.map((day) => (
                <td key={`dp-${day}`} className="border border-zinc-100 p-1 text-center text-[10px] font-extrabold text-zinc-600">
                  {getDailyPercent(day)}%
                </td>
              ))}
              <td className="border border-zinc-100 p-2" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
