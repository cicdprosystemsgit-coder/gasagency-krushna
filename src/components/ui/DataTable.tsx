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
  columns, data, keyField,
  searchable = true, searchKeys = [],
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
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
    >
      {searchable && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #E4E4E7" }}>
          <div
            className="flex items-center gap-2 h-8 px-3 rounded-md flex-1 max-w-xs"
            style={{ background: "#F4F4F5", border: "1px solid #E4E4E7" }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#A1A1AA" }} />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search…"
              className="bg-transparent text-[13px] outline-none flex-1 min-w-0"
              style={{ color: "#18181B" }}
            />
          </div>
          {filtered.length !== data.length && (
            <span className="text-[12px]" style={{ color: "#A1A1AA" }}>
              {filtered.length} of {data.length}
            </span>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table">
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
                <td colSpan={columns.length} className="py-16 text-center" style={{ color: "#A1A1AA" }}>
                  {emptyIcon && <div className="flex justify-center mb-3 opacity-30">{emptyIcon}</div>}
                  <p className="text-[13px]">{emptyMessage}</p>
                </td>
              </tr>
            ) : pageData.map((row) => (
              <tr key={String(row[keyField])}>
                {columns.map((col) => (
                  <td key={String(col.key)} className={alignClass(col.align)}>
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: "1px solid #E4E4E7" }}
        >
          <p className="text-[12px]" style={{ color: "#A1A1AA" }}>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-ghost w-7 h-7 p-0 justify-center disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className="btn w-7 h-7 p-0 justify-center text-[12px] font-medium"
                style={
                  p === page
                    ? { background: "#2563EB", color: "#fff", border: "1px solid #2563EB" }
                    : { background: "transparent", color: "#71717A", border: "1px solid transparent" }
                }
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost w-7 h-7 p-0 justify-center disabled:opacity-30"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
