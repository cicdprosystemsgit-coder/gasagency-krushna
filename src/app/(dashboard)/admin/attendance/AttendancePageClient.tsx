"use client";

import { useState, useTransition, useEffect } from "react";
import { Clock, UserCheck, UserX, Coffee, Calendar, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { markAttendance } from "@/app/actions/attendance";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { DateNavigationHeader } from "@/components/ui/DateNavigationHeader";

type Employee = { id: string; name: string; role: string };
type AttendanceRecord = {
  id: string; name: string; role: string;
  status: string; punchIn: Date | null; punchOut: Date | null;
};

type Props = {
  todayData: AttendanceRecord[];
  employees: Employee[];
  selectedDate: string;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  PRESENT:  { label: "Present",  bg: "#DCFCE7", color: "#15803D", icon: <UserCheck className="w-3.5 h-3.5" /> },
  ABSENT:   { label: "Absent",   bg: "#FEE2E2", color: "#B91C1C", icon: <UserX className="w-3.5 h-3.5" /> },
  HALF_DAY: { label: "Half Day", bg: "#FEF9C3", color: "#854D0E", icon: <Coffee className="w-3.5 h-3.5" /> },
  ON_LEAVE: { label: "On Leave", bg: "#F0F9FF", color: "#0284C7", icon: <Calendar className="w-3.5 h-3.5" /> },
  HOLIDAY:  { label: "Holiday",  bg: "#F5F3FF", color: "#7C3AED", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function AttendancePageClient({ todayData, employees, selectedDate }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>(todayData);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Sync records when data changes from server (e.g. on page refresh / date navigation)
  useEffect(() => {
    setRecords(todayData);
  }, [todayData]);

  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const onLeave = records.filter((r) => r.status === "ON_LEAVE").length;
  const halfDay = records.filter((r) => r.status === "HALF_DAY").length;

  const handleMarkStatus = (employeeId: string, status: string) => {
    setMarkingId(employeeId);
    startTransition(async () => {
      const result = await markAttendance({ employeeId, date: selectedDate, status });
      if ("error" in result && result.error) {
        setMsg(result.error);
      } else {
        setRecords((prev) =>
          prev.map((r) => r.id === employeeId ? { ...r, status } : r)
        );
        setMsg(null);
      }
      setMarkingId(null);
    });
  };

  const handleDateChange = (newDate: string) => {
    router.push(`?date=${newDate}`);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            Attendance
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            Daily punch summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">View Date:</span>
          <DateNavigationHeader selectedDate={selectedDate} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Present", value: present, bg: "#DCFCE7", color: "#15803D", icon: <UserCheck className="w-4 h-4" /> },
          { label: "Absent", value: absent, bg: "#FEE2E2", color: "#B91C1C", icon: <UserX className="w-4 h-4" /> },
          { label: "On Leave", value: onLeave, bg: "#F0F9FF", color: "#0284C7", icon: <Calendar className="w-4 h-4" /> },
          { label: "Half Day", value: halfDay, bg: "#FEF9C3", color: "#854D0E", icon: <Coffee className="w-4 h-4" /> },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="text-[20px] font-bold" style={{ color: "#18181B" }}>{s.value}</p>
              <p className="text-[11px]" style={{ color: "#71717A" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-[13px]" style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5" }}>
          {msg}
        </div>
      )}

      {/* Attendance table */}
      <div className="card overflow-hidden">
        <div className="card-section">
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
            Today's Attendance — {records.length} employees
          </p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Role</th>
              <th>Status</th>
              <th>Punch In</th>
              <th>Punch Out</th>
              <th>Duration</th>
              <th>Mark</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[13px]" style={{ color: "#A1A1AA" }}>
                  No employees found
                </td>
              </tr>
            ) : records.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.ABSENT;
              const duration = r.punchIn && r.punchOut
                ? (() => {
                    const mins = Math.floor((new Date(r.punchOut).getTime() - new Date(r.punchIn).getTime()) / 60000);
                    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                  })()
                : null;

              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: "#2563EB" }}
                      >
                        {r.name.charAt(0)}
                      </div>
                      <span className="font-medium text-[13px]" style={{ color: "#18181B" }}>{r.name}</span>
                    </div>
                  </td>
                  <td className="muted text-[12px]">{r.role.replace(/_/g, " ")}</td>
                  <td>
                    <span className="badge flex items-center gap-1 w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td>
                    <span className="flex items-center gap-1 text-[12px]" style={{ color: "#52525B" }}>
                      {r.punchIn ? (
                        <><Clock className="w-3 h-3" /> {formatTime(r.punchIn)}</>
                      ) : "—"}
                    </span>
                  </td>
                  <td>
                    <span className="text-[12px]" style={{ color: "#52525B" }}>
                      {formatTime(r.punchOut)}
                    </span>
                  </td>
                  <td className="text-[12px]" style={{ color: "#52525B" }}>{duration ?? "—"}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      {(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleMarkStatus(r.id, status)}
                          disabled={isPending && markingId === r.id}
                          title={STATUS_CONFIG[status].label}
                          className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-zinc-100"
                          style={{
                            color: r.status === status ? STATUS_CONFIG[status].color : "#D4D4D8",
                            background: r.status === status ? STATUS_CONFIG[status].bg : "transparent",
                          }}
                        >
                          <span style={{ color: STATUS_CONFIG[status].color }}>{STATUS_CONFIG[status].icon}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
