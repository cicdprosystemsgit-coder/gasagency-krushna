/**
 * src/components/delivery/DeliveryPhotoBackupPanel.tsx
 *
 * Admin UI panel for:
 *  1. Selecting a date range for backup
 *  2. Previewing what will be backed up (per-day breakdown)
 *  3. Confirming and triggering the backup
 *  4. Live status display while backup is running
 *  5. Full backup history log
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CloudUpload,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FolderArchive,
  Cloud,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Images,
} from "lucide-react";
import { CylinderLoader } from "@/components/ui/CylinderLoader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BackupRecord {
  id: string;
  status: string; // RUNNING | COMPLETED | FAILED
  totalPhotos: number;
  copiedPhotos: number;
  skippedPhotos: number;
  failedPhotos: number;
  driveEnabled: boolean;
  driveCopiedPhotos: number;
  driveSkippedPhotos: number;
  driveFailedPhotos: number;
  s3Bucket: string | null;
  fromDate: string;
  toDate: string;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  triggeredBy: { name: string; role: string };
}

interface PreviewDay {
  date: string; // YYYY-MM-DD
  deliveries: number;
  photos: number;
}

interface PreviewData {
  agencyName?: string | null;
  agencyFolder?: string;
  fromDate: string;
  toDate: string;
  totalDeliveries: number;
  totalPhotos: number;
  days: PreviewDay[];
}

type PanelStep = "select-dates" | "previewing" | "confirm" | "running" | "done";

// ── Utility ───────────────────────────────────────────────────────────────────

function todayISOLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function daysAgoISOLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DeliveryPhotoBackupPanel() {
  const [step, setStep] = useState<PanelStep>("select-dates");
  const [startDate, setStartDate] = useState<string>(daysAgoISOLocal(14));
  const [endDate, setEndDate] = useState<string>(todayISOLocal());
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  const [pollBackupId, setPollBackupId] = useState<string | null>(null);
  const [activeRunning, setActiveRunning] = useState<BackupRecord | null>(null);

  // ── History fetcher ───────────────────────────────────────────────────────

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/delivery-photos");
      if (res.ok) {
        const data = await res.json();
        const list: BackupRecord[] = data.backups ?? [];
        setBackups(list);
        const running = list.find((b) => b.status === "RUNNING");
        if (running) {
          setPollBackupId(running.id);
          setActiveRunning(running);
          setStep("running");
        } else {
          setPollBackupId(null);
          if (step === "running") {
            setStep("done");
            setActiveRunning(list[0] ?? null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch backup history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Polling while a backup is RUNNING ────────────────────────────────────

  useEffect(() => {
    if (!pollBackupId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/backup/delivery-photos?id=${pollBackupId}`, {
        method: "HEAD",
      });
      const status = res.headers.get("X-Backup-Status");
      if (status && status !== "RUNNING") {
        clearInterval(interval);
        setPollBackupId(null);
        fetchHistory();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [pollBackupId, fetchHistory]);

  // ── Step handlers ─────────────────────────────────────────────────────────

  async function handlePreview() {
    if (!startDate || !endDate) {
      setErrorMsg("Please select both a start date and end date.");
      return;
    }
    setErrorMsg(null);
    setStep("previewing");
    setPreviewData(null);
    try {
      const res = await fetch(
        `/api/backup/delivery-photos?preview=true&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch preview");
      setPreviewData(data as PreviewData);
      setStep("confirm");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Preview failed");
      setStep("select-dates");
    }
  }

  async function handleConfirmBackup() {
    setErrorMsg(null);
    setStep("running");
    try {
      const res = await fetch("/api/backup/delivery-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to trigger backup");
      if (data.backupId) {
        setPollBackupId(data.backupId);
        fetchHistory();
      } else {
        setStep("done");
        fetchHistory();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Backup failed to start");
      setStep("select-dates");
    }
  }

  function handleReset() {
    setStep("select-dates");
    setPreviewData(null);
    setErrorMsg(null);
    setStartDate(daysAgoISOLocal(14));
    setEndDate(todayISOLocal());
    setActiveRunning(null);
  }

  const latestBackup = backups[0];
  const isRunning = step === "running" || !!pollBackupId;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-white">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Dual Cloud Photo Backup</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> AWS S3 + Google Drive
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Archive delivery proof photos for a custom date range to your company S3 bucket and
              Google Drive. Each agency&apos;s data is isolated in its own folder.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setHistoryLoading(true); fetchHistory(); }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Error Alert ──────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Error</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 1: Select Date Range                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {(step === "select-dates") && (
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
            <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              Select Backup Date Range
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Backup Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || todayISOLocal()}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Backup End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={todayISOLocal()}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                />
              </div>
            </div>

            {/* Quick range presets */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Last 7 days", days: 6 },
                { label: "Last 15 days", days: 14 },
                { label: "Last 30 days", days: 29 },
                { label: "Last 3 months", days: 89 },
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setStartDate(daysAgoISOLocal(days)); setEndDate(todayISOLocal()); }}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!startDate || !endDate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-all shadow-sm"
              >
                <Eye className="w-4 h-4" />
                Preview Backup Data
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 1b: Previewing (loading)                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === "previewing" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-6 flex flex-col items-center justify-center">
            <CylinderLoader size="md" color="blue" message="Scanning Delivery Photos" subtitle="Counting photos in selected date range…" />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 2: Preview & Confirm                                     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === "confirm" && previewData && (
          <div className="space-y-3">
            {/* Summary banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Images className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-bold text-amber-900">Backup Preview</p>
                <span className="ml-auto text-xs text-amber-700 font-medium">
                  {fmtDate(previewData.fromDate)} → {fmtDate(previewData.toDate)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg border border-amber-100 p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{previewData.totalDeliveries}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Deliveries with photos</p>
                </div>
                <div className="bg-white rounded-lg border border-amber-100 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{previewData.totalPhotos}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Total photos to archive</p>
                </div>
                <div className="bg-white rounded-lg border border-amber-100 p-3 text-center col-span-2 sm:col-span-1">
                  <p className="text-2xl font-bold text-gray-900">{previewData.days.length}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Active days in range</p>
                </div>
              </div>

              {previewData.totalPhotos === 0 && (
                <div className="flex items-center gap-2 text-amber-700 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  No photos found in this date range. Backup would complete with 0 files.
                </div>
              )}
            </div>

            {/* Per-day breakdown */}
            {previewData.days.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    Date-wise Breakdown
                  </p>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Deliveries</th>
                        <th className="px-3 py-2 text-right">Photos</th>
                        <th className="px-3 py-2 text-left">Folder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewData.days.map((day) => (
                        <tr key={day.date} className="hover:bg-gray-50/70">
                          <td className="px-3 py-2 font-medium text-gray-800">
                            {fmtDate(day.date)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-600">
                            {day.deliveries}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-700">
                            {day.photos}
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-gray-500">
                            agencies/<span className="font-semibold text-blue-700">{previewData.agencyFolder || "agency_id"}</span>/backups/{day.date}/
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Important instructions */}
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                Important — Before You Proceed
              </p>
              <ul className="list-disc list-inside space-y-1 text-orange-700 ml-1">
                <li>Photos will be copied from Cloudinary to S3 / Google Drive.</li>
                <li>Database URLs will be updated to point to S3 (if S3 is enabled).</li>
                <li>Cloudinary originals will be <strong>deleted</strong> after successful upload to free storage quota.</li>
                <li>Already-backed-up files will be skipped (idempotent — safe to re-run).</li>
                <li>This process may take several minutes for large date ranges.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ← Change Dates
              </button>
              <button
                type="button"
                onClick={handleConfirmBackup}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
              >
                <CloudUpload className="w-4 h-4" />
                Confirm & Start Backup
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 3: Backup Running                                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === "running" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-800">Backup in Progress</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Archiving photos to AWS S3 and Google Drive. This may take a few minutes.
                </p>
              </div>
            </div>
            {previewData && (
              <div className="bg-white rounded-lg border border-blue-100 p-3 text-xs text-gray-700">
                <p className="font-semibold text-gray-800 mb-1">Backup window</p>
                <p className="text-gray-600">
                  {fmtDate(previewData.fromDate)} → {fmtDate(previewData.toDate)}
                </p>
                <p className="mt-0.5 text-gray-600">
                  <span className="font-semibold text-blue-700">{previewData.totalPhotos}</span> photos
                  across {previewData.days.length} days queued for archival.
                </p>
              </div>
            )}
            <p className="text-[11px] text-blue-500">
              Please keep this tab open. The page will update automatically when the backup
              completes.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* STEP 4: Done — latest backup result                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {step === "done" && latestBackup && (
          <div className="space-y-3">
            <div
              className={`rounded-xl border p-4 space-y-3 ${
                latestBackup.status === "COMPLETED"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {latestBackup.status === "COMPLETED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p
                    className={`text-sm font-bold ${
                      latestBackup.status === "COMPLETED" ? "text-emerald-800" : "text-red-800"
                    }`}
                  >
                    Backup {latestBackup.status === "COMPLETED" ? "Completed" : "Failed"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Start New Backup →
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
                  <p className="text-lg font-bold text-gray-900">{latestBackup.totalPhotos}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Total Photos</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-600">{latestBackup.copiedPhotos}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">S3 Copied</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-600">{latestBackup.driveCopiedPhotos}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Drive Copied</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-100 p-2.5 text-center">
                  <p
                    className={`text-lg font-bold ${
                      latestBackup.failedPhotos > 0 ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {latestBackup.failedPhotos}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Failed</p>
                </div>
              </div>

              {latestBackup.errorMessage && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>{latestBackup.errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Latest backup quick-stats (always visible if not running/confirm) */}
        {latestBackup &&
          !historyLoading &&
          step === "select-dates" && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                  Last Backup
                </span>
                <span className="font-medium text-gray-800">
                  {fmtDateTime(latestBackup.startedAt)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                  Status
                </span>
                <span className="inline-flex items-center gap-1 font-bold">
                  {latestBackup.status === "COMPLETED" && (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Completed</span>
                    </>
                  )}
                  {latestBackup.status === "RUNNING" && (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span className="text-blue-700">Running…</span>
                    </>
                  )}
                  {latestBackup.status === "FAILED" && (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span className="text-red-700">Failed</span>
                    </>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-amber-500" /> AWS S3
                </span>
                <span className="font-semibold text-gray-900">
                  {latestBackup.s3Bucket ? (
                    <>
                      {latestBackup.copiedPhotos} copied
                      {latestBackup.skippedPhotos > 0 && (
                        <span className="text-[10px] text-gray-500 font-normal">
                          {" "}
                          ({latestBackup.skippedPhotos} existing)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 font-normal">Not configured</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-semibold flex items-center gap-1">
                  <FolderArchive className="w-3 h-3 text-blue-500" /> Google Drive
                </span>
                <span className="font-semibold text-gray-900">
                  {latestBackup.driveEnabled ? (
                    <>
                      {latestBackup.driveCopiedPhotos} copied
                      {latestBackup.driveSkippedPhotos > 0 && (
                        <span className="text-[10px] text-gray-500 font-normal">
                          {" "}
                          ({latestBackup.driveSkippedPhotos} existing)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 font-normal">Not configured</span>
                  )}
                </span>
              </div>
              <div className="col-span-2 md:col-span-1">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                  Triggered By
                </span>
                <span className="font-medium text-gray-800">
                  {latestBackup.triggeredBy?.name ?? "Admin"}
                </span>
              </div>
            </div>
          )}

        {/* ── Backup History Table ─────────────────────────────────────── */}
        {backups.length > 0 && !historyLoading && (
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600 transition-colors"
            >
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Recent Backup Logs
            </button>
            {showHistory && (
              <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2">Started</th>
                      <th className="px-3 py-2">Window</th>
                      <th className="px-3 py-2">Photos</th>
                      <th className="px-3 py-2">AWS S3</th>
                      <th className="px-3 py-2">Drive</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backups.slice(0, 10).map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                          {fmtDateTime(b.startedAt)}
                        </td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {new Date(b.fromDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            –{" "}
                            {new Date(b.toDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-800">
                          {b.totalPhotos}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {b.s3Bucket ? (
                            <>
                              <span className="font-semibold text-gray-900">
                                {b.copiedPhotos + b.skippedPhotos}
                              </span>
                              <span className="text-gray-400 text-[10px]"> photos</span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {b.driveEnabled ? (
                            <>
                              <span className="font-semibold text-gray-900">
                                {b.driveCopiedPhotos + b.driveSkippedPhotos}
                              </span>
                              <span className="text-gray-400 text-[10px]"> photos</span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {b.status === "COMPLETED" && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                              ✅ COMPLETED
                            </span>
                          )}
                          {b.status === "RUNNING" && (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 animate-pulse">
                              ⏳ RUNNING
                            </span>
                          )}
                          {b.status === "FAILED" && (
                            <span
                              className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 cursor-help"
                              title={b.errorMessage ?? "Error"}
                            >
                              ❌ FAILED
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500 font-medium">
                          {b.triggeredBy?.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {historyLoading && (
          <div className="flex flex-col items-center justify-center py-6">
            <CylinderLoader size="sm" message="Loading backup history" subtitle="Fetching cloud sync logs..." />
          </div>
        )}
      </div>
    </div>
  );
}
