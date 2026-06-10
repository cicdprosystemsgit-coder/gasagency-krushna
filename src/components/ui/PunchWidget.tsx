"use client";

import { useState, useEffect, useTransition } from "react";
import { Clock, LogIn, LogOut, CheckCircle2 } from "lucide-react";
import { punchIn, punchOut, getMyTodayAttendance } from "@/app/actions/attendance";

type Attendance = {
  id: string;
  punchIn: Date | null;
  punchOut: Date | null;
  status: string;
};

function formatTime(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function getHoursWorked(punchIn: Date | null, punchOut: Date | null): string {
  if (!punchIn) return "—";
  const end = punchOut ? new Date(punchOut) : new Date();
  const mins = Math.floor((end.getTime() - new Date(punchIn).getTime()) / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function PunchWidget() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    startTransition(async () => {
      const result = await getMyTodayAttendance();
      setAttendance(result.attendance as Attendance | null);
    });
  }, []);

  // Live clock tick
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePunchIn = () => {
    startTransition(async () => {
      const result = await punchIn();
      if ("error" in result && result.error) { setMsg(result.error); }
      else if ("attendance" in result) { setAttendance(result.attendance as Attendance); setMsg(null); }
    });
  };

  const handlePunchOut = () => {
    startTransition(async () => {
      const result = await punchOut();
      if ("error" in result && result.error) { setMsg(result.error); }
      else if ("attendance" in result) { setAttendance(result.attendance as Attendance); setMsg(null); }
    });
  };

  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: "#2563EB" }} />
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Attendance</p>
        </div>
        <p className="text-[12px] font-mono font-semibold" style={{ color: "#52525B" }}>
          {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <p className="text-[11px]" style={{ color: "#A1A1AA" }}>In</p>
          <p className="text-[13px] font-semibold" style={{ color: "#16A34A" }}>{formatTime(attendance?.punchIn ?? null)}</p>
        </div>
        <div className="flex-1 h-px" style={{ background: "#E4E4E7" }} />
        <div className="text-center">
          <p className="text-[11px]" style={{ color: "#A1A1AA" }}>Worked</p>
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{getHoursWorked(attendance?.punchIn ?? null, attendance?.punchOut ?? null)}</p>
        </div>
        <div className="flex-1 h-px" style={{ background: "#E4E4E7" }} />
        <div className="text-center">
          <p className="text-[11px]" style={{ color: "#A1A1AA" }}>Out</p>
          <p className="text-[13px] font-semibold" style={{ color: "#DC2626" }}>{formatTime(attendance?.punchOut ?? null)}</p>
        </div>
      </div>

      {/* Action */}
      {msg && (
        <p className="text-[11px] mb-2" style={{ color: "#D97706" }}>{msg}</p>
      )}

      {hasPunchedOut ? (
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#16A34A" }}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Day complete — great work!
        </div>
      ) : hasPunchedIn ? (
        <button
          onClick={handlePunchOut}
          disabled={isPending}
          className="w-full btn btn-danger flex items-center justify-center gap-1.5"
          style={{ fontSize: 13 }}
        >
          <LogOut className="w-3.5 h-3.5" />
          {isPending ? "Punching out…" : "Punch Out"}
        </button>
      ) : (
        <button
          onClick={handlePunchIn}
          disabled={isPending}
          className="w-full btn btn-primary flex items-center justify-center gap-1.5"
          style={{ fontSize: 13 }}
        >
          <LogIn className="w-3.5 h-3.5" />
          {isPending ? "Punching in…" : "Punch In"}
        </button>
      )}
    </div>
  );
}
