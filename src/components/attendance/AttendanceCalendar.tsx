"use client";

import { useState, useEffect, startTransition } from "react";
import { ChevronLeft, ChevronRight, Calendar, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { getMyAttendanceHistory, submitRegularizationRequest } from "@/app/actions/attendance";
import { StreakBadge } from "./StreakBadge";

type AttendanceRecord = {
  id: string;
  date: Date | string;
  punchIn: Date | string | null;
  punchOut: Date | string | null;
  status: string;
  notes: string | null;
};

interface Props {
  initialRecords: AttendanceRecord[];
  userId: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const STATUS_STYLING: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PRESENT: { bg: "bg-emerald-50 hover:bg-emerald-100/70 border-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", label: "Present" },
  ABSENT: { bg: "bg-red-50 hover:bg-red-100/70 border-red-100", text: "text-red-800", dot: "bg-red-500", label: "Absent" },
  HALF_DAY: { bg: "bg-amber-50 hover:bg-amber-100/70 border-amber-100", text: "text-amber-800", dot: "bg-amber-500", label: "Half Day" },
  ON_LEAVE: { bg: "bg-sky-50 hover:bg-sky-100/70 border-sky-100", text: "text-sky-800", dot: "bg-sky-500", label: "On Leave" },
  HOLIDAY: { bg: "bg-purple-50 hover:bg-purple-100/70 border-purple-100", text: "text-purple-800", dot: "bg-purple-500", label: "Holiday" },
};

export function AttendanceCalendar({ initialRecords, userId }: Props) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [selectedDay, setSelectedDay] = useState<{ day: number; record: AttendanceRecord | null } | null>(null);
  
  // Regularization Modal states
  const [showRegModal, setShowRegModal] = useState(false);
  const [regReason, setRegReason] = useState("");
  const [regInTime, setRegInTime] = useState("");
  const [regOutTime, setRegOutTime] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Load records on month/year changes
  useEffect(() => {
    const loadHistory = async () => {
      const res = await getMyAttendanceHistory(currentMonth + 1, currentYear);
      if (res.data) {
        setRecords(res.data as any[]);
      }
    };
    loadHistory();
  }, [currentMonth, currentYear]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
  };

  // Generate calendar days
  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // We adjust firstDay to match Monday start if desired, but default Sunday start is simpler:
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  };

  const calendarDays = getDaysInMonth();

  // Find attendance record for a specific day
  const getRecordForDay = (day: number | null): AttendanceRecord | null => {
    if (!day) return null;
    const match = records.find(r => {
      const recDate = new Date(r.date);
      return recDate.getDate() === day &&
             recDate.getMonth() === currentMonth &&
             recDate.getFullYear() === currentYear;
    });
    return match || null;
  };

  // Compute stats
  const presentCount = records.filter(r => r.status === "PRESENT").length;
  const absentCount = records.filter(r => r.status === "ABSENT").length;
  const leaveCount = records.filter(r => r.status === "ON_LEAVE").length;
  const halfDayCount = records.filter(r => r.status === "HALF_DAY").length;

  const handleRegSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay.day).padStart(2, "0")}`;
    const punchInDateTime = regInTime ? `${dateStr}T${regInTime}:00` : undefined;
    const punchOutDateTime = regOutTime ? `${dateStr}T${regOutTime}:00` : undefined;

    const res = await submitRegularizationRequest({
      date: dateStr,
      reason: regReason,
      requestedPunchIn: punchInDateTime,
      requestedPunchOut: punchOutDateTime,
    });

    setIsSubmitting(false);
    if (res.error) {
      setSubmitError(res.error);
    } else {
      setSubmitSuccess(true);
      setRegReason("");
      setRegInTime("");
      setRegOutTime("");
      setTimeout(() => {
        setShowRegModal(false);
        setSubmitSuccess(false);
      }, 2000);
    }
  };

  const getStreakInfo = () => {
    const sorted = [...records].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentStreak = 0;
    let absenteeCount = 0;
    for (const r of sorted) {
      if (r.status === "PRESENT") {
        currentStreak++;
      } else if (r.status === "ABSENT") {
        currentStreak = 0;
        absenteeCount++;
      }
    }
    const perfectMonth = records.length > 0 && absenteeCount === 0;
    return { streak: currentStreak, perfectMonth, absenteeCount };
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation & Stats Header */}
      <div className="card p-5 border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-white">
        <div className="flex items-center gap-4 justify-between md:justify-start flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold text-zinc-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <StreakBadge {...getStreakInfo()} />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border hover:bg-zinc-50 border-zinc-200 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={handleNextMonth} className="p-1.5 rounded-lg border hover:bg-zinc-50 border-zinc-200 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Compact stats pill list */}
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-100">
            Present: {presentCount}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-100">
            Half Day: {halfDayCount}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 font-semibold border border-red-100">
            Absent: {absentCount}
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 font-semibold border border-sky-100">
            Leave: {leaveCount}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card p-6 border border-zinc-100 shadow-sm bg-white">
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-zinc-500 mb-3 uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-16 bg-zinc-50/50 rounded-xl" />;
              }

              const rec = getRecordForDay(day);
              const styling = rec ? STATUS_STYLING[rec.status] : null;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDay({ day, record: rec })}
                  className={`h-16 rounded-xl border flex flex-col items-start p-2 transition-all relative ${
                    styling?.bg || "bg-white hover:bg-zinc-50/80 border-zinc-200"
                  } ${selectedDay?.day === day ? "ring-2 ring-blue-500/50 scale-[1.02]" : ""}`}
                >
                  <span className={`text-[12px] font-bold ${styling?.text || "text-zinc-600"}`}>
                    {day}
                  </span>
                  {styling && (
                    <div className="mt-auto flex items-center gap-1 w-full">
                      <span className={`w-1.5 h-1.5 rounded-full ${styling.dot}`} />
                      <span className="text-[9px] font-medium hidden sm:inline-block truncate">
                        {styling.label}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details / Regularization Trigger */}
        <div className="card p-6 border border-zinc-100 shadow-sm bg-white flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 mb-4 border-b pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-500" />
              Day Details
            </h3>
            
            {selectedDay ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] text-zinc-500 font-semibold uppercase">Selected Date</label>
                  <p className="text-sm font-bold text-zinc-800">
                    {selectedDay.day} {MONTHS[currentMonth]} {currentYear}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 font-semibold uppercase">Status</label>
                  <p className="text-sm mt-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedDay.record ? STATUS_STYLING[selectedDay.record.status]?.bg : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {selectedDay.record ? STATUS_STYLING[selectedDay.record.status]?.label : "Not Marked / Absent"}
                    </span>
                  </p>
                </div>

                {selectedDay.record?.punchIn && (
                  <div>
                    <label className="text-[11px] text-zinc-500 font-semibold uppercase font-mono">Punch In</label>
                    <p className="text-xs font-medium text-zinc-700">
                      {new Date(selectedDay.record.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {selectedDay.record?.punchOut && (
                  <div>
                    <label className="text-[11px] text-zinc-500 font-semibold uppercase font-mono">Punch Out</label>
                    <p className="text-xs font-medium text-zinc-700">
                      {new Date(selectedDay.record.punchOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                {selectedDay.record?.notes && (
                  <div>
                    <label className="text-[11px] text-zinc-500 font-semibold uppercase">Notes</label>
                    <p className="text-xs text-zinc-600">{selectedDay.record.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">Select a day from the calendar to view full log details or request corrections.</p>
            )}
          </div>

          {selectedDay && (
            <button
              onClick={() => setShowRegModal(true)}
              className="mt-6 w-full py-2 px-3 rounded-lg border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 transition text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4" />
              Request Correction / Regularization
            </button>
          )}
        </div>
      </div>

      {/* Regularization Modal */}
      {showRegModal && selectedDay && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-100 relative animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-zinc-800 mb-2">Request Regularization</h3>
            <p className="text-xs text-zinc-500 mb-4">
              Submit correction request for {selectedDay.day} {MONTHS[currentMonth]} {currentYear}
            </p>

            <form onSubmit={handleRegSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Reason for request</label>
                <textarea
                  required
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  placeholder="e.g. Forgot to punch out / Device battery died..."
                  className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Requested In Time</label>
                  <input
                    type="time"
                    value={regInTime}
                    onChange={(e) => setRegInTime(e.target.value)}
                    className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Requested Out Time</label>
                  <input
                    type="time"
                    value={regOutTime}
                    onChange={(e) => setRegOutTime(e.target.value)}
                    className="w-full p-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
                  />
                </div>
              </div>

              {submitError && (
                <div className="p-2.5 rounded bg-red-50 text-red-600 text-xs font-semibold">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="p-2.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Request submitted successfully!
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="py-2 px-4 rounded-lg border hover:bg-zinc-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
