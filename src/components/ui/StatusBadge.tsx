interface StatusBadgeProps {
  status: string;
  className?: string;
}

const config: Record<string, { label: string; style: React.CSSProperties }> = {
  PENDING:          { label: "Pending",          style: { background: "#FEF9C3", color: "#854D0E", border: "1px solid #FEF08A" } },
  APPROVED:         { label: "Approved",         style: { background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC" } },
  REJECTED:         { label: "Rejected",         style: { background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" } },
  CORRECTION_NEEDED:{ label: "Correction Needed",style: { background: "#FED7AA", color: "#9A3412", border: "1px solid #FDBA74" } },
  DELIVERED:        { label: "Delivered",        style: { background: "#D1FAE5", color: "#065F46", border: "1px solid #6EE7B7" } },
  PARTIAL:          { label: "Partial",          style: { background: "#FEF9C3", color: "#854D0E", border: "1px solid #FEF08A" } },
  CANCELLED:        { label: "Cancelled",        style: { background: "#F4F4F5", color: "#71717A", border: "1px solid #E4E4E7" } },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const c = config[status] ?? { label: status, style: { background: "#F4F4F5", color: "#71717A", border: "1px solid #E4E4E7" } };
  return (
    <span
      className={`badge ${className}`}
      style={c.style}
    >
      {c.label}
    </span>
  );
}
