/**
 * Gasagency — Application Logger
 *
 * Log rotation rules:
 *  • New file every day  → gasagency_logs_YYYYMMDD.log
 *  • If a day's file exceeds 100 MB → gasagency_logs_YYYYMMDD_1.log, _2.log …
 *  • Keeps 30 days of history before auto-deletion
 *  • All logs are JSON-structured for easy grep / parsing
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// ── Log directory ────────────────────────────────────────────────────────────
// In Docker: bind-mount the host path to /app/logs via docker-compose volumes.
// Locally: falls back to ./logs in the project root.
const LOG_DIR = process.env.LOG_DIR ?? path.join(process.cwd(), "logs");

// Ensure directory exists (Docker volume may not create sub-dirs)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Formats ──────────────────────────────────────────────────────────────────
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${extra}`;
  })
);

// ── Rotating file transport ──────────────────────────────────────────────────
// Filename pattern:  gasagency_logs_20260719.log
// When size > 100 MB: gasagency_logs_20260719_1.log, _2.log …  (winston appends numeric suffix)
const rotatingTransport = new DailyRotateFile({
  dirname: LOG_DIR,
  filename: "gasagency_logs_%DATE%.log",   // %DATE% is replaced by datePattern below
  datePattern: "YYYYMMDD",                // → gasagency_logs_20260719.log
  maxSize: "100m",                        // chunk at 100 MB → adds _1, _2 suffix
  maxFiles: "30d",                        // auto-delete files older than 30 days
  zippedArchive: false,                   // keep plain text for easy tail / grep
  createSymlink: true,                    // gasagency_logs_current.log → today's file
  symlinkName: "gasagency_logs_current.log",
  auditFile: path.join(LOG_DIR, ".log-audit.json"),
  format: jsonFormat,
});

// Emit a startup message whenever rotation occurs
rotatingTransport.on("rotate", (oldFilename, newFilename) => {
  console.info(`[logger] Rotated: ${oldFilename} → ${newFilename}`);
});

rotatingTransport.on("new", (newFilename) => {
  console.info(`[logger] New log file created: ${newFilename}`);
});

// ── Logger instance ──────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  transports: [
    rotatingTransport,
    new winston.transports.Console({
      silent: process.env.NODE_ENV === "test",
      format: consoleFormat,
    }),
  ],
  // Don't crash the app if logging itself throws
  exitOnError: false,
});

// ── Convenience helpers ──────────────────────────────────────────────────────

/** Log an API request (call from middleware or route handlers) */
export function logRequest(method: string, path: string, statusCode: number, durationMs: number, extra?: Record<string, unknown>) {
  logger.info("http_request", { method, path, statusCode, durationMs, ...extra });
}

/** Log a database error */
export function logDbError(operation: string, error: unknown, extra?: Record<string, unknown>) {
  logger.error("db_error", { operation, error: String(error), ...extra });
}

/** Log a security event (failed login, token rejected, etc.) */
export function logSecurityEvent(event: string, detail: Record<string, unknown>) {
  logger.warn("security_event", { event, ...detail });
}
