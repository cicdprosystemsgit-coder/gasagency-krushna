"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Edit3, CheckCircle2 } from "lucide-react";
import { getAttendanceSummary, markAttendance } from "@/app/actions/attendance";

type Employee = { id: string; name: string; role: string };
type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: Date | string;
  punchIn: Date | string | null;
  punchOut: Date | string | null;
  status: string;
  notes: string | null;
};

interface Props {
  employees: Employee[];
  initialRecords: AttendanceRecord[];
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

export function AttendanceCalendarAdmin({ employees, initialRecords }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || "");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [selectedDay, setSelectedDay] = useState<{ day: number; record: AttendanceRecord | null } | null>(null);

  // Edit status state
  const [editMode, setEditMode] = useState(false);
  const [newStatus, setNewStatus] = useState("PRESENT");
  const [newNotes, setNewNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Load records for employee/month
  useEffect(() => {
    const loadHistory = async () => {
      const res = await getAttendanceSummary(currentMonth + 1, currentYear);
      if (res.data) {
        // Filter for selected employee only
        const filtered = (res.data as any[]).filter(r => r.employeeId === selectedEmployeeId);
        setRecords(filtered);
      }
    };
    if (selectedEmployeeId) {
      loadHistory();
    }
  }, [selectedEmployeeId, currentMonth, currentYear]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(null);
    setEditMode(false);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(null);
    setEditMode(false);
  };

  // Generate calendar days
  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    
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

  const handleUpdateStatus = async () => {
    if (!selectedDay || !selectedEmployeeId) return;
    setLoading(true);
    setMsg(null);

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay.day).padStart(2, "0")}`;
    const res = await markAttendance({
      employeeId: selectedEmployeeId,
      date: dateStr,
      status: newStatus,
      notes: newNotes,
    });

    setLoading(false);
    if (res.error) {
      setMsg(res.error);
    } else {
      setMsg("Saved successfully!");
      setEditMode(false);
      // Update local state
      const updatedRecord = res.attendance as AttendanceRecord;
      setRecords(prev => {
        const idx = prev.findIndex(r => {
          const d = new Date(r.date);
          return d.getDate() === selectedDay.day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        if (idx > -1) {
          const next = [...prev];
          next[idx] = updatedRecord;
          return next;
        }
        return [...prev, updatedRecord];
      });
      setSelectedDay({ day: selectedDay.day, record: updatedRecord });
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls & Nav */}
      <div className="card p-5 border border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-white">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedEmployeeId}
            onChange={(e) => {
              setSelectedEmployeeId(e.target.value);
              setSelectedDay(null);
              setEditMode(false);
            }}
            className="p-2 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.replace(/_/g, " ")})</option>
            ))}
          </select>

          <div className="flex items-center gap-2 justify-between">
            <h2 className="text-sm font-bold text-zinc-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-lg border hover:bg-zinc-50 border-zinc-200 transition">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-lg border hover:bg-zinc-50 border-zinc-200 transition">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
                  onClick={() => {
                    setSelectedDay({ day, record: rec });
                    setEditMode(false);
                    if (rec) {
                      setNewStatus(rec.status);
                      setNewNotes(rec.notes || "");
                    } else {
                      setNewStatus("PRESENT");
                      setNewNotes("");
                    }
                  }}
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

        {/* Admin Detail Panel & Edit Box */}
        <div className="card p-6 border border-zinc-100 shadow-sm bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 border-b pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Day Logs (Admin)
            </h3>

            {selectedDay ? (
              !editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-zinc-500 font-semibold uppercase">Date</label>
                    <p className="text-sm font-bold text-zinc-800">{selectedDay.day} {MONTHS[currentMonth]} {currentYear}</p>
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
                      <label className="text-[11px] text-zinc-500 font-semibold uppercase">Punch In</label>
                      <p className="text-xs text-zinc-700 font-medium">
                        {new Date(selectedDay.record.punchIn).toLocaleTimeString("en-IN")}
                      </p>
                    </div>
                  )}
                  {selectedDay.record?.punchOut && (
                    <div>
                      <label className="text-[11px] text-zinc-500 font-semibold uppercase">Punch Out</label>
                      <p className="text-xs text-zinc-700 font-medium">
                        {new Date(selectedDay.record.punchOut).toLocaleTimeString("en-IN")}
                      </p>
                    </div>
                  )}
                  {selectedDay.record?.notes && (
                    <div>
                      <label className="text-[11px] text-zinc-500 font-semibold uppercase">Notes</label>
                      <p className="text-xs text-zinc-600">{selectedDay.record.notes}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setEditMode(true)}
                    className="w-full py-2 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition text-xs font-bold flex items-center justify-center gap-1.5 text-zinc-700"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Day Log
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">Mark Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
                    >
                      <option value="PRESENT">Present</option>
                      <option value="ABSENT">Absent</option>
                      <option value="HALF_DAY">Half Day</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="HOLIDAY">Holiday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 mb-1">Add Note / Remark</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="e.g. Approved leave request..."
                      className="w-full p-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-zinc-50/50"
                      rows={3}
                    />
                  </div>

                  {msg && (
                    <div className="p-2 text-xs font-semibold text-zinc-600 bg-zinc-50 border rounded flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {msg}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 py-2 rounded-lg border hover:bg-zinc-50 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStatus}
                      disabled={loading}
                      className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Save Log"}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <p className="text-xs text-zinc-400 italic">Select a calendar day to view or edit log parameters.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
