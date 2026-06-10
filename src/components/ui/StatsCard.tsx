interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "green" | "orange" | "red" | "purple";
}

const iconColors: Record<string, { bg: string; text: string }> = {
  blue:   { bg: "#EFF6FF", text: "#2563EB" },
  green:  { bg: "#F0FDF4", text: "#16A34A" },
  orange: { bg: "#FFFBEB", text: "#D97706" },
  red:    { bg: "#FEF2F2", text: "#DC2626" },
  purple: { bg: "#F5F3FF", text: "#7C3AED" },
};

const trendStyles = {
  up:      { bg: "#F0FDF4", text: "#16A34A", arrow: "↑" },
  down:    { bg: "#FEF2F2", text: "#DC2626", arrow: "↓" },
  neutral: { bg: "#F4F4F5", text: "#71717A", arrow: "→" },
};

export function StatsCard({ title, value, subtitle, icon, trend = "neutral", trendValue, color = "blue" }: StatsCardProps) {
  const ic = iconColors[color];
  const tr = trendStyles[trend];

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3"
      style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: ic.bg, color: ic.text }}
        >
          {icon}
        </div>
        {trendValue && (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: tr.bg, color: tr.text }}
          >
            {tr.arrow} {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-[22px] font-bold tracking-tight leading-none" style={{ color: "#18181B" }}>{value}</p>
        <p className="text-[13px] font-medium mt-1.5" style={{ color: "#52525B" }}>{title}</p>
        {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "#A1A1AA" }}>{subtitle}</p>}
      </div>
    </div>
  );
}
