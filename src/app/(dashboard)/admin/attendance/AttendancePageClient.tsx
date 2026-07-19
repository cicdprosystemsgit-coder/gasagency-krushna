"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Clock,
  UserCheck,
  UserX,
  Coffee,
  Calendar,
  CheckCircle2,
  XCircle,
  MapPin,
  List,
  Map as MapIcon,
  Grid,
  Settings,
  Trash2,
  Plus,
  AlertCircle,
  FileText,
  Download,
  Search,
  FileSpreadsheet
} from "lucide-react";
import {
  markAttendance,
  bulkMarkAttendance,
  reviewRegularizationRequest,
  createShift,
  deleteShift,
  getLateEarlyReport,
  getOvertimeReport
} from "@/app/actions/attendance";
import { generateAttendanceCompliancePDF } from "@/lib/generateAttendanceCompliancePDF";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { DateNavigationHeader } from "@/components/ui/DateNavigationHeader";
import { TeamHeatmap } from "@/components/attendance/TeamHeatmap";
import { AttendanceCalendarAdmin } from "@/components/attendance/AttendanceCalendarAdmin";
import { StreakBadge } from "@/components/attendance/StreakBadge";
import dynamic from "next/dynamic";

// Dynamic import for Leaflet map to prevent SSR issues
const AdminAttendanceMap = dynamic(
  () => import("@/components/attendance/AdminAttendanceMap"),
  { ssr: false }
);

type Employee = { id: string; name: string; role: string };
type AttendanceRecord = {
  id: string;
  name: string;
  role: string;
  status: string;
  punchIn: Date | string | null;
  punchOut: Date | string | null;
  punchInLat: number | null;
  punchInLng: number | null;
  punchOutLat: number | null;
  punchOutLng: number | null;
};

type RegularizationRequest = {
  id: string;
  employeeId: string;
  employee: { name: string; role: string };
  date: Date | string;
  reason: string;
  requestedPunchIn: Date | string | null;
  requestedPunchOut: Date | string | null;
  status: string;
  reviewNote: string | null;
  reviewedBy: { name: string } | null;
  reviewedAt: Date | string | null;
  createdAt: Date | string;
};

type WorkShift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  isDefault: boolean;
};

type Props = {
  todayData: AttendanceRecord[];
  employees: Employee[];
  selectedDate: string;
  regularizations: RegularizationRequest[];
  shifts: WorkShift[];
  monthAttendance: any[];
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  PRESENT:  { label: "Present",  bg: "#DCFCE7", color: "#15803D", icon: <UserCheck className="w-3.5 h-3.5" /> },
  ABSENT:   { label: "Absent",   bg: "#FEE2E2", color: "#B91C1C", icon: <UserX className="w-3.5 h-3.5" /> },
  HALF_DAY: { label: "Half Day", bg: "#FEF9C3", color: "#854D0E", icon: <Coffee className="w-3.5 h-3.5" /> },
  ON_LEAVE: { label: "On Leave", bg: "#F0F9FF", color: "#0284C7", icon: <Calendar className="w-3.5 h-3.5" /> },
  HOLIDAY:  { label: "Holiday",  bg: "#F5F3FF", color: "#7C3AED", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
};

function formatTime(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function AttendancePageClient({
  todayData,
  employees,
  selectedDate,
  regularizations: initialRegularizations,
  shifts: initialShifts,
  monthAttendance
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"summary" | "map" | "heatmap" | "shifts" | "reports">("summary");

  // Reports state
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [lateEarlyData, setLateEarlyData] = useState<any[]>([]);

  const [overtimeMonth, setOvertimeMonth] = useState(new Date().getMonth() + 1);
  const [overtimeYear, setOvertimeYear] = useState(new Date().getFullYear());
  const [overtimeData, setOvertimeData] = useState<any[]>([]);

  const [complianceMonth, setComplianceMonth] = useState(new Date().getMonth() + 1);
  const [complianceYear, setComplianceYear] = useState(new Date().getFullYear());

  const [records, setRecords] = useState<AttendanceRecord[]>(todayData);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Bulk marking state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>("PRESENT");

  // Map settings state
  const [mapLayer, setMapLayer] = useState<"punchIn" | "punchOut" | "both">("both");

  // Shifts state
  const [shifts, setShifts] = useState<WorkShift[]>(initialShifts);
  const [shiftName, setShiftName] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [shiftGrace, setShiftGrace] = useState(15);
  const [shiftDefault, setShiftDefault] = useState(false);

  // Regularizations state
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>(initialRegularizations);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // Sync records when data changes from server
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
      if (result.error) {
        setMsg(result.error);
        setSuccessMsg(null);
      } else {
        setRecords((prev) =>
          prev.map((r) => r.id === employeeId ? { ...r, status } : r)
        );
        setMsg(null);
        setSuccessMsg("Attendance status updated.");
      }
      setMarkingId(null);
    });
  };

  const handleBulkMark = () => {
    if (selectedEmployees.length === 0) {
      setMsg("Please select at least one employee.");
      return;
    }
    startTransition(async () => {
      const result = await bulkMarkAttendance(selectedEmployees, selectedDate, bulkStatus);
      if (result.error) {
        setMsg(result.error);
        setSuccessMsg(null);
      } else {
        setRecords((prev) =>
          prev.map((r) =>
            selectedEmployees.includes(r.id) ? { ...r, status: bulkStatus } : r
          )
        );
        setSelectedEmployees([]);
        setMsg(null);
        setSuccessMsg("Bulk attendance updated successfully!");
      }
    });
  };

  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === records.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(records.map((r) => r.id));
    }
  };

  // Regularization actions
  const handleReviewRegularization = (id: string, status: "APPROVED" | "REJECTED") => {
    const note = reviewNotes[id] || "";
    startTransition(async () => {
      const result = await reviewRegularizationRequest(id, status, note);
      if (result.error) {
        setMsg(result.error);
        setSuccessMsg(null);
      } else {
        setRegularizations((prev) =>
          prev.map((req) => (req.id === id ? { ...req, status, reviewNote: note } : req))
        );
        setSuccessMsg(`Request successfully ${status.toLowerCase()}!`);
        setMsg(null);
        router.refresh();
      }
    });
  };

  // Shift configurations
  const handleCreateShift = () => {
    if (!shiftName) {
      setMsg("Please enter a shift name.");
      return;
    }
    startTransition(async () => {
      const res = await createShift({
        name: shiftName,
        startTime: shiftStart,
        endTime: shiftEnd,
        gracePeriod: shiftGrace,
        isDefault: shiftDefault
      });
      if (res.error) {
        setMsg(res.error);
      } else if (res.shift) {
        setShifts((prev) => [...prev, res.shift as WorkShift]);
        setShiftName("");
        setSuccessMsg("Shift created successfully!");
        setMsg(null);
      }
    });
  };

  const handleDeleteShift = (id: string) => {
    startTransition(async () => {
      const res = await deleteShift(id);
      if (res.error) {
        setMsg(res.error);
      } else {
        setShifts((prev) => prev.filter((s) => s.id !== id));
        setSuccessMsg("Shift deleted.");
        setMsg(null);
      }
    });
  };

  const handleFetchLateEarly = () => {
    startTransition(async () => {
      const res = await getLateEarlyReport(reportStartDate, reportEndDate);
      if (res.error) {
        setMsg(res.error);
      } else {
        setLateEarlyData(res.data || []);
        setSuccessMsg("Late arrival & early departure report loaded.");
        setMsg(null);
      }
    });
  };

  const handleFetchOvertime = () => {
    startTransition(async () => {
      const res = await getOvertimeReport(overtimeMonth, overtimeYear);
      if (res.error) {
        setMsg(res.error);
      } else {
        setOvertimeData(res.data || []);
        setSuccessMsg("Overtime report loaded.");
        setMsg(null);
      }
    });
  };

  const handleDownloadCompliance = async () => {
    const selectedMonthRecords = monthAttendance.filter((r: any) => {
      const d = new Date(r.date);
      return d.getMonth() + 1 === complianceMonth && d.getFullYear() === complianceYear;
    });

    const recordsData = employees.map((emp) => {
      const empRecords = selectedMonthRecords.filter((r: any) => r.employeeId === emp.id);
      const totalPresent = empRecords.filter((r: any) => r.status === "PRESENT").length;
      const totalAbsent = empRecords.filter((r: any) => r.status === "ABSENT").length;
      const totalHalfDay = empRecords.filter((r: any) => r.status === "HALF_DAY").length;
      const totalLeave = empRecords.filter((r: any) => r.status === "ON_LEAVE").length;

      const totalDays = empRecords.length || 1;
      const rate = Math.round(((totalPresent + totalHalfDay * 0.5) / totalDays) * 100);

      return {
        employeeName: emp.name,
        role: emp.role,
        present: totalPresent,
        absent: totalAbsent,
        halfDay: totalHalfDay,
        leave: totalLeave,
        rate,
      };
    });

    await generateAttendanceCompliancePDF({
      agencyName: "Gas Agency Portal",
      month: complianceMonth,
      year: complianceYear,
      records: recordsData,
    });
  };

  const downloadCSV = (data: any[], headers: string[], filename: string) => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...data.map((row) =>
          Object.values(row)
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(",")
        ),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLateEarlyCSV = () => {
    if (lateEarlyData.length === 0) return;
    const headers = ["Employee", "Date", "Shift Start", "Shift End", "Punch In", "Punch Out", "Late Min", "Early Min"];
    const formatted = lateEarlyData.map((d) => ({
      name: d.employeeName,
      date: d.date,
      start: d.shiftStart,
      end: d.shiftEnd,
      in: d.punchIn,
      out: d.punchOut,
      late: d.lateMinutes,
      early: d.earlyMinutes,
    }));
    downloadCSV(formatted, headers, `Late_Early_Report_${reportStartDate}_to_${reportEndDate}.csv`);
  };

  const exportOvertimeCSV = () => {
    if (overtimeData.length === 0) return;
    const headers = ["Employee", "Date", "Regular Hrs", "Overtime Min", "Overtime Hrs", "Total Hrs"];
    const formatted = overtimeData.map((d) => ({
      name: d.employeeName,
      date: d.date,
      reg: d.regularHours,
      otMin: d.overtimeMinutes,
      otHrs: d.overtimeHours,
      tot: d.totalHours,
    }));
    downloadCSV(formatted, headers, `Overtime_Report_${overtimeMonth}_${overtimeYear}.csv`);
  };

  const getEmployeeStreakInfo = (employeeId: string) => {
    const empRecords = monthAttendance.filter((r: any) => r.employeeId === employeeId);
    const sorted = [...empRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

    const perfectMonth = empRecords.length > 0 && absenteeCount === 0;
    return { streak: currentStreak, perfectMonth, absenteeCount };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-zinc-900">
            Attendance Center
          </h1>
          <p className="text-[13px] mt-0.5 text-zinc-500">
            Monitor and manage employee locations, shifts, & hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">View Date:</span>
          <DateNavigationHeader selectedDate={selectedDate} />
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <List className="w-4 h-4" /> Today's Summary
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === "map"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <MapIcon className="w-4 h-4" /> Live Map View
        </button>
        <button
          onClick={() => setActiveTab("heatmap")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === "heatmap"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Grid className="w-4 h-4" /> Calendar & Heatmap
        </button>
        <button
          onClick={() => setActiveTab("shifts")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === "shifts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Settings className="w-4 h-4" /> Shifts & Regularization
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
            activeTab === "reports"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <FileText className="w-4 h-4" /> Analytics & Reports
        </button>
      </div>

      {/* Message banners */}
      {msg && (
        <div className="p-3 text-xs font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200">
          {msg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          {successMsg}
        </div>
      )}

      {/* Tab: Summary */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Stats count */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Present", value: present, bg: "#DCFCE7", color: "#15803D", icon: <UserCheck className="w-4 h-4" /> },
              { label: "Absent", value: absent, bg: "#FEE2E2", color: "#B91C1C", icon: <UserX className="w-4 h-4" /> },
              { label: "On Leave", value: onLeave, bg: "#F0F9FF", color: "#0284C7", icon: <Calendar className="w-4 h-4" /> },
              { label: "Half Day", value: halfDay, bg: "#FEF9C3", color: "#854D0E", icon: <Coffee className="w-4 h-4" /> },
            ].map((s) => (
              <div key={s.label} className="card p-4 flex items-center gap-3 bg-white border border-zinc-200 shadow-sm rounded-xl">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[20px] font-bold text-zinc-800 leading-none mb-1">{s.value}</p>
                  <p className="text-[11px] font-semibold text-zinc-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="card p-4 border border-zinc-200 bg-white shadow-sm rounded-xl flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-600">Bulk mark selected:</span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="p-1.5 border border-zinc-200 rounded-lg text-xs font-bold bg-zinc-50/50"
              >
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
              <button
                onClick={handleBulkMark}
                disabled={isPending || selectedEmployees.length === 0}
                className="py-1.5 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
              >
                Mark Attendance
              </button>
            </div>
            <span className="text-xs font-semibold text-zinc-500">
              {selectedEmployees.length} employees selected
            </span>
          </div>

          {/* Table */}
          <div className="card overflow-hidden bg-white border border-zinc-200 rounded-xl shadow-sm">
            <table className="table w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === records.length && records.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Role</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Punch In (GPS)</th>
                  <th className="p-3 text-center">Punch Out (GPS)</th>
                  <th className="p-3 text-center">Duration</th>
                  <th className="p-3 text-right">Quick Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-xs text-zinc-400 italic">
                      No employees active today
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.ABSENT;
                    const duration = r.punchIn && r.punchOut
                      ? (() => {
                          const mins = Math.floor((new Date(r.punchOut).getTime() - new Date(r.punchIn).getTime()) / 60000);
                          return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                        })()
                      : null;

                    const isChecked = selectedEmployees.includes(r.id);

                    return (
                      <tr key={r.id} className="hover:bg-zinc-50/50 transition">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectEmployee(r.id)}
                            className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-blue-600 flex-shrink-0">
                              {r.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-zinc-800">{r.name}</span>
                              <StreakBadge {...getEmployeeStreakInfo(r.id)} />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-zinc-500 font-semibold uppercase">
                          {r.role.replace(/_/g, " ")}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-zinc-700">
                              {formatTime(r.punchIn)}
                            </span>
                            {r.punchInLat && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-1 rounded mt-0.5" title={`${r.punchInLat}, ${r.punchInLng}`}>
                                <MapPin className="w-2.5 h-2.5" /> GPS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-semibold text-zinc-700">
                              {formatTime(r.punchOut)}
                            </span>
                            {r.punchOutLat && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded mt-0.5" title={`${r.punchOutLat}, ${r.punchOutLng}`}>
                                <MapPin className="w-2.5 h-2.5" /> GPS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center text-xs font-mono font-bold text-zinc-700">
                          {duration ?? "—"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {(["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE"] as const).map((status) => (
                              <button
                                key={status}
                                onClick={() => handleMarkStatus(r.id, status)}
                                disabled={isPending && markingId === r.id}
                                title={STATUS_CONFIG[status].label}
                                className="w-6 h-6 rounded flex items-center justify-center transition hover:bg-zinc-100"
                                style={{
                                  color: r.status === status ? STATUS_CONFIG[status].color : "#D4D4D8",
                                  background: r.status === status ? STATUS_CONFIG[status].bg : "transparent",
                                }}
                              >
                                {STATUS_CONFIG[status].icon}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Map View */}
      {activeTab === "map" && (
        <div className="space-y-4">
          {/* Layer switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-500">Show Pins:</span>
            <div className="flex border border-zinc-200 rounded-lg overflow-hidden text-xs bg-white shadow-sm">
              {(["both", "punchIn", "punchOut"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setMapLayer(l)}
                  className={`px-4 py-1.5 font-bold transition-colors ${
                    mapLayer === l
                      ? "bg-blue-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {l === "both" ? "All Locations" : l === "punchIn" ? "▶ Punch In" : "■ Punch Out"}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-zinc-400 ml-2">
              {records.filter((r) => r.punchInLat || r.punchOutLat).length} of {records.length} employees have GPS data
            </span>
          </div>

          <AdminAttendanceMap data={records} layer={mapLayer} selectedDate={selectedDate} />
        </div>
      )}

      {/* Tab: Calendar & Heatmap */}
      {activeTab === "heatmap" && (
        <div className="space-y-8">
          <TeamHeatmap
            employees={employees}
            records={monthAttendance}
            month={new Date().getMonth() + 1}
            year={new Date().getFullYear()}
          />

          <hr className="border-zinc-200" />

          <div>
            <h3 className="text-sm font-bold text-zinc-800 mb-3">Individual Audit Calendars</h3>
            <AttendanceCalendarAdmin employees={employees} initialRecords={monthAttendance} />
          </div>
        </div>
      )}

      {/* Tab: Shifts & Regularization */}
      {activeTab === "shifts" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Regularizations column */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-800 border-b pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" /> Attendance Correction Requests
            </h3>

            {regularizations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-zinc-200 border-dashed">
                No correction requests submitted.
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[500px]">
                {regularizations.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col justify-between gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-zinc-800">{req.employee.name}</p>
                        <p className="text-[10px] text-zinc-400 font-semibold">{new Date(req.date).toLocaleDateString("en-IN")}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700"
                            : req.status === "REJECTED"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-2.5 space-y-1.5 text-xs text-zinc-600">
                      <p><strong>Reason:</strong> {req.reason}</p>
                      {req.requestedPunchIn && (
                        <p><strong>Requested In:</strong> {new Date(req.requestedPunchIn).toLocaleTimeString("en-IN")}</p>
                      )}
                      {req.requestedPunchOut && (
                        <p><strong>Requested Out:</strong> {new Date(req.requestedPunchOut).toLocaleTimeString("en-IN")}</p>
                      )}
                    </div>

                    {req.status === "PENDING" ? (
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <input
                          type="text"
                          placeholder="Review note (optional)..."
                          value={reviewNotes[req.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          className="w-full p-2 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewRegularization(req.id, "REJECTED")}
                            disabled={isPending}
                            className="flex-1 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleReviewRegularization(req.id, "APPROVED")}
                            disabled={isPending}
                            className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ) : (
                      req.reviewNote && (
                        <p className="text-[10px] text-zinc-400 border-t pt-1.5 italic">
                          Reviewer Note: {req.reviewNote} (by {req.reviewedBy?.name})
                        </p>
                      )
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shifts column */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-800 border-b pb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" /> Work Shifts Configuration
              </h3>

              {/* Add Shift form */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm space-y-3.5">
                <h4 className="text-xs font-bold text-zinc-700">Add New Shift</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Shift Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Morning Shift"
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs bg-zinc-50/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Start Time</label>
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs bg-zinc-50/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">End Time</label>
                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className="w-full p-2 border rounded-lg text-xs bg-zinc-50/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Grace Period (Mins)</label>
                    <input
                      type="number"
                      value={shiftGrace}
                      onChange={(e) => setShiftGrace(Number(e.target.value))}
                      className="w-full p-2 border rounded-lg text-xs bg-zinc-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="shiftDefault"
                      checked={shiftDefault}
                      onChange={(e) => setShiftDefault(e.target.checked)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="shiftDefault" className="text-xs font-semibold text-zinc-600">
                      Set as Default
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleCreateShift}
                  disabled={isPending}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Create Shift
                </button>
              </div>
            </div>

            {/* List of Shifts */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-zinc-600">Configured Shifts</h4>
              {shifts.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">No shifts configured.</p>
              ) : (
                <div className="grid gap-2">
                  {shifts.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 border rounded-xl bg-zinc-50/50 flex items-center justify-between text-xs hover:border-zinc-300 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-800">{s.name}</span>
                          {s.isDefault && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-600 rounded text-[9px] font-extrabold uppercase">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 mt-0.5">
                          {s.startTime} - {s.endTime} (Grace: {s.gracePeriod}m)
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteShift(s.id)}
                        disabled={isPending}
                        className="p-1 text-zinc-400 hover:text-red-500 transition rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === "reports" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left panel: Report selection & Controls */}
          <div className="space-y-6 lg:col-span-1">
            {/* 1. Late Arrival & Early Departure */}
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Late / Early Departure
              </h3>
              <p className="text-xs text-zinc-500">
                Track employees arriving after shift start or leaving before shift end.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">Start Date</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">End Date</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleFetchLateEarly}
                  disabled={isPending}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
                >
                  <Search className="w-4 h-4" /> Fetch Report
                </button>
              </div>
            </div>

            {/* 2. Overtime Tracker */}
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Overtime Tracker
              </h3>
              <p className="text-xs text-zinc-500">
                Identify hours worked beyond defined shift schedules.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">Month</label>
                  <select
                    value={overtimeMonth}
                    onChange={(e) => setOvertimeMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("en", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">Year</label>
                  <select
                    value={overtimeYear}
                    onChange={(e) => setOvertimeYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleFetchOvertime}
                disabled={isPending}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
              >
                <Search className="w-4 h-4" /> Fetch Overtime
              </button>
            </div>

            {/* 3. Monthly Compliance PDF */}
            <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" /> Compliance PDF
              </h3>
              <p className="text-xs text-zinc-500">
                Generate a formal monthly compliance and attendance report PDF.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">Month</label>
                  <select
                    value={complianceMonth}
                    onChange={(e) => setComplianceMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString("en", { month: "long" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 mb-1 uppercase">Year</label>
                  <select
                    value={complianceYear}
                    onChange={(e) => setComplianceYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {[2025, 2026, 2027].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleDownloadCompliance}
                className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF Report
              </button>
            </div>
          </div>

          {/* Right panel: Report View Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* View container */}
            <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm min-h-[400px] flex flex-col">
              {/* If no report is loaded */}
              {lateEarlyData.length === 0 && overtimeData.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <FileText className="w-10 h-10 text-zinc-300 mb-2" />
                  <p className="text-sm font-bold text-zinc-700">No Report Data Loaded</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Select date range or month/year on the left sidebar controls to fetch reports.
                  </p>
                </div>
              )}

              {/* Late / Early Departure Table */}
              {lateEarlyData.length > 0 && (
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">Late Arrival & Early Departure Report</h3>
                      <p className="text-xs text-zinc-500">
                        Date range: {reportStartDate} to {reportEndDate}
                      </p>
                    </div>
                    <button
                      onClick={exportLateEarlyCSV}
                      className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-50 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-zinc-100 rounded-xl">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs text-left">
                      <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-center">Punch In</th>
                          <th className="px-4 py-3 text-center">Punch Out</th>
                          <th className="px-4 py-3 text-right">Late (Min)</th>
                          <th className="px-4 py-3 text-right">Early (Min)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white">
                        {lateEarlyData.map((d, i) => (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-zinc-800">{d.employeeName}</td>
                            <td className="px-4 py-3 text-zinc-600">{d.date}</td>
                            <td className="px-4 py-3 text-center text-zinc-600">{d.punchIn}</td>
                            <td className="px-4 py-3 text-center text-zinc-600">{d.punchOut}</td>
                            <td className="px-4 py-3 text-right font-semibold text-red-600">
                              {d.lateMinutes > 0 ? `${d.lateMinutes}m` : "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-amber-600">
                              {d.earlyMinutes > 0 ? `${d.earlyMinutes}m` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Overtime Table */}
              {overtimeData.length > 0 && (
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950">Overtime Details Report</h3>
                      <p className="text-xs text-zinc-500">
                        Period: {new Date(0, overtimeMonth - 1).toLocaleString("en", { month: "long" })} {overtimeYear}
                      </p>
                    </div>
                    <button
                      onClick={exportOvertimeCSV}
                      className="px-3 py-1.5 border border-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-50 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-zinc-100 rounded-xl">
                    <table className="min-w-full divide-y divide-zinc-200 text-xs text-left">
                      <thead className="bg-zinc-50 text-zinc-500 uppercase font-bold tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-right">Regular Hrs</th>
                          <th className="px-4 py-3 text-right">Overtime (Min)</th>
                          <th className="px-4 py-3 text-right">Overtime (Hrs)</th>
                          <th className="px-4 py-3 text-right">Total Hrs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 bg-white">
                        {overtimeData.map((d, i) => (
                          <tr key={i} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-zinc-800">{d.employeeName}</td>
                            <td className="px-4 py-3 text-zinc-600">{d.date}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{d.regularHours}h</td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                              {d.overtimeMinutes}m
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              {d.overtimeHours}h
                            </td>
                            <td className="px-4 py-3 text-right text-zinc-850 font-medium">{d.totalHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
