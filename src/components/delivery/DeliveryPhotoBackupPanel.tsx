/**
 * src/components/delivery/DeliveryPhotoBackupPanel.tsx
 * Admin UI panel for manual S3 backup trigger and backup history display.
 * Includes status polling and AWS credential warning modal/alert.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { CloudUpload, CheckCircle2, XCircle, Loader2, Calendar, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";

interface BackupRecord {
  id: string;
  status: string; // RUNNING | COMPLETED | FAILED
  totalPhotos: number;
  copiedPhotos: number;
  skippedPhotos: number;
  failedPhotos: number;
  fromDate: string;
  toDate: string;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
  triggeredBy: { name: string; role: string };
}

export function DeliveryPhotoBackupPanel() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollBackupId, setPollBackupId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/delivery-photos");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups ?? []);
        // Check if any is currently running
        const running = (data.backups as BackupRecord[])?.find((b) => b.status === "RUNNING");
        if (running) setPollBackupId(running.id);
        else setPollBackupId(null);
      }
    } catch (err) {
      console.error("Failed to fetch backup history", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Polling mechanism when a job is RUNNING
  useEffect(() => {
    if (!pollBackupId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/backup/delivery-photos?id=${pollBackupId}`, { method: "HEAD" });
      const status = res.headers.get("X-Backup-Status");
      if (status && status !== "RUNNING") {
        clearInterval(interval);
        setPollBackupId(null);
        fetchHistory(); // Refresh table
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollBackupId, fetchHistory]);

  async function handleTriggerBackup() {
    setTriggering(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/backup/delivery-photos", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to trigger backup");
      }
      if (data.backupId) {
        setPollBackupId(data.backupId);
        fetchHistory();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Trigger failed");
    } finally {
      setTriggering(false);
    }
  }

  const latestBackup = backups[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 shadow-xs space-y-4">
      {/* Header & Trigger Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
            <CloudUpload className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">AWS S3 Photo Backup</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Compliant Storage
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated & manual 15-day snapshot archival from Cloudinary to isolated AWS S3 bucket.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHistory}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh history"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={triggering || !!pollBackupId}
            onClick={handleTriggerBackup}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-all shadow-xs"
          >
            {triggering || pollBackupId ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {pollBackupId ? "Backup in Progress..." : "Initiating..."}
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                Backup Now (15-Day Snapshot)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error message alert */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backup Action Failed</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Status banner for latest backup */}
      {latestBackup && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Last Execution</span>
            <span className="font-medium text-gray-800">
              {new Date(latestBackup.startedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Status</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
              {latestBackup.status === "COMPLETED" && <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed</>}
              {latestBackup.status === "RUNNING" && <><Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> Archiving...</>}
              {latestBackup.status === "FAILED" && <><XCircle className="w-3.5 h-3.5 text-red-600" /> Failed</>}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Photos Backed Up</span>
            <span className="font-semibold text-gray-900">
              {latestBackup.copiedPhotos + latestBackup.skippedPhotos} / {latestBackup.totalPhotos}
              {latestBackup.skippedPhotos > 0 && <span className="text-[10px] text-gray-500 font-normal"> ({latestBackup.skippedPhotos} existing)</span>}
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Triggered By</span>
            <span className="font-medium text-gray-800">{latestBackup.triggeredBy?.name ?? "Admin"}</span>
          </div>
        </div>
      )}

      {/* History table (collapsible/recent 5) */}
      {backups.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent S3 Backup Logs</p>
          <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2">Date & Time</th>
                  <th className="px-3 py-2">Window</th>
                  <th className="px-3 py-2">Photos</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {backups.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {new Date(b.startedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-3 py-2 text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {new Date(b.fromDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - {new Date(b.toDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      <span className="font-semibold">{b.copiedPhotos + b.skippedPhotos}</span>
                      <span className="text-gray-400 text-[10px]"> photos</span>
                    </td>
                    <td className="px-3 py-2">
                      {b.status === "COMPLETED" && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">✅ COMPLETED</span>}
                      {b.status === "RUNNING" && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 animate-pulse">⏳ RUNNING</span>}
                      {b.status === "FAILED" && <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800" title={b.errorMessage ?? "Error"}>❌ FAILED</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500 font-medium">{b.triggeredBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
