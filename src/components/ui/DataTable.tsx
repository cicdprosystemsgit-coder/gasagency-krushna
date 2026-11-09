"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  searchable?: boolean;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pageSize?: number;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  searchable = true,
  searchKeys = [],
  emptyMessage = "No records found",
  emptyIcon,
  pageSize = 12,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = searchable && query.trim()
    ? data.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(query.toLowerCase()))
      )
    : data;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const alignClass = (a?: string) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
      {searchable && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg flex-1 max-w-sm bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 shadow-xs">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search records…"
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none flex-1 min-w-0"
            />
          </div>
          {filtered.length !== data.length && (
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              {filtered.length} of {data.length}
            </span>
          )}
        </div>
      )}

      {/* Responsive Horizontal Touch Scroll Wrapper */}
      <div className="overflow-x-auto touch-scroll-x overscroll-x-contain relative scrollbar-thin">
        <table className="table min-w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={alignClass(col.align)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-zinc-400 dark:text-zinc-500">
                  {emptyIcon && <div className="flex justify-center mb-3 opacity-30">{emptyIcon}</div>}
                  <p className="text-xs">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr key={String(row[keyField])}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className={alignClass(col.align)}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 text-xs">
          <p className="font-mono text-zinc-500 dark:text-zinc-400 text-[11px]">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-md text-xs font-semibold transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
