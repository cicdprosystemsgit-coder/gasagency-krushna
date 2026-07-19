import Link from "next/link";
import { Users, Clock, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

interface AttendanceSnapshot {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  missing: string[];
  error?: string;
}

export function AdminAttendanceDashboardWidget({
  snapshot,
}: {
  snapshot: AttendanceSnapshot | { error: string } | undefined;
}) {
  if (!snapshot || "error" in snapshot) {
    return null;
  }

  const { total = 0, present = 0, absent = 0, halfDay = 0, onLeave = 0, missing = [] } = snapshot as AttendanceSnapshot;
  const punchPercentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
    >
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid #E4E4E7" }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>
            Live Attendance
          </p>
        </div>
        <Link
          href="/admin/attendance"
          className="flex items-center gap-1 text-[12px] font-medium transition-colors"
          style={{ color: "#2563EB" }}
        >
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="p-4 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-medium mb-1.5" style={{ color: "#52525B" }}>
            <span>Present Today</span>
            <span>
              {present} / {total} ({punchPercentage}%)
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${punchPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          <div className="bg-red-50 text-red-700 py-1.5 px-2 rounded-md">
            <p className="text-[10px] text-red-500 uppercase font-medium">Absent</p>
            <p className="text-sm mt-0.5">{absent}</p>
          </div>
          <div className="bg-amber-50 text-amber-700 py-1.5 px-2 rounded-md">
            <p className="text-[10px] text-amber-500 uppercase font-medium">Half Day</p>
            <p className="text-sm mt-0.5">{halfDay}</p>
          </div>
          <div className="bg-blue-50 text-blue-700 py-1.5 px-2 rounded-md">
            <p className="text-[10px] text-blue-500 uppercase font-medium">Leave</p>
            <p className="text-sm mt-0.5">{onLeave}</p>
          </div>
        </div>

        {/* Missing / Late Employees */}
        {missing.length > 0 && (
          <div className="border-t pt-3" style={{ borderColor: "#F4F4F5" }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Not Punched In Yet ({missing.length})</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {missing.slice(0, 5).map((name) => (
                <span
                  key={name}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-50 border border-zinc-100 text-zinc-600 font-medium"
                >
                  {name}
                </span>
              ))}
              {missing.length > 5 && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-50 border border-zinc-100 text-zinc-400 font-medium">
                  +{missing.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {missing.length === 0 && total > 0 && (
          <div className="flex items-center gap-1.5 justify-center py-1 text-xs text-emerald-600 font-semibold bg-emerald-50 rounded-md">
            <ShieldCheck className="w-4 h-4" />
            <span>All employees accounted for today!</span>
          </div>
        )}
      </div>
    </div>
  );
}
