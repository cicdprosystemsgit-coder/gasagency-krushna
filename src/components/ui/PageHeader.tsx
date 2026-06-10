interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#EFF6FF", color: "#2563EB" }}
          >
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
