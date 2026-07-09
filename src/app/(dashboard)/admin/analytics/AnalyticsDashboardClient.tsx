"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Users, Package, DollarSign, BarChart2, RefreshCw, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

type Props = {
  revenue: Array<{ month: string; label: string; domestic: number; commercial: number; total: number }>;
  productSales: Array<{ name: string; qty: number; revenue: number }>;
  deliveryPerf: Array<{ name: string; delivered: number; cashCollected: number; target: number; achievement: number | null }>;
  topCustomers: Array<{ name: string; qty: number; cash: number }>;
  plSummary: {
    totalRevenue: number; totalCOGS: number; grossProfit: number;
    totalExpenses: number; netProfit: number; grossMargin: number; netMargin: number;
    expenseByCategory: Record<string, number>;
    domesticRevenue: number; commercialRevenue: number;
  } | null;
  inventory: Array<{ month: string; label: string; inflow: number; outflow: number }>;
  initialDateFrom?: string;
  initialDateTo?: string;
};

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#7C3AED", "#EC4899", "#0891B2", "#EA580C"];

function StatCard({ title, value, sub, color, icon }: {
  title: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium" style={{ color: "#71717A" }}>{title}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + "20", color }}>
          {icon}
        </div>
      </div>
      <p className="text-[20px] font-bold tracking-tight" style={{ color: "#18181B" }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "#A1A1AA" }}>{sub}</p>}
    </div>
  );
}

export function AnalyticsDashboardClient({ revenue, productSales, deliveryPerf, topCustomers, plSummary, inventory, initialDateFrom = "", initialDateTo = "" }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "delivery" | "customers" | "inventory">("overview");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDateChange(from: string, to: string) {
    const params = new URLSearchParams();
    if (from) params.set("dateFrom", from);
    if (to) params.set("dateTo", to);
    startTransition(() => {
      router.push(`/admin/analytics?${params.toString()}`);
    });
  }

  const tabs = [
    { id: "overview", label: "P&L Overview" },
    { id: "delivery", label: "Delivery Performance" },
    { id: "customers", label: "Top Customers" },
    { id: "inventory", label: "Inventory" },
  ] as const;

  const pieData = plSummary
    ? Object.entries(plSummary.expenseByCategory).map(([name, value]) => ({ name, value: Math.round(value) }))
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
            Analytics Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
            Business intelligence
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker dateFrom={initialDateFrom} dateTo={initialDateTo} onChange={handleDateChange} />
          <button
            onClick={() => window.location.reload()}
            className="btn btn-secondary flex items-center gap-1.5 animate-none"
            disabled={isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(plSummary?.totalRevenue ?? 0)}
          sub="This month"
          color="#2563EB"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          title="Gross Profit"
          value={formatCurrency(plSummary?.grossProfit ?? 0)}
          sub={`${plSummary?.grossMargin ?? 0}% margin`}
          color="#16A34A"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(plSummary?.netProfit ?? 0)}
          sub={`${plSummary?.netMargin ?? 0}% net margin`}
          color={(plSummary?.netProfit ?? 0) >= 0 ? "#16A34A" : "#DC2626"}
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <StatCard
          title="Total Expenses"
          value={formatCurrency(plSummary?.totalExpenses ?? 0)}
          sub="This month"
          color="#D97706"
          icon={<Package className="w-4 h-4" />}
        />
      </div>

      {/* Revenue Trend Chart */}
      <div className="card mb-4">
        <div className="card-section flex items-center justify-between">
          <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Revenue Trend (6 months)</p>
        </div>
        <div className="p-4">
          {revenue.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-[13px]" style={{ color: "#A1A1AA" }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717A" }} />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v as number)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="domestic" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="Domestic" />
                <Line type="monotone" dataKey="commercial" stroke="#16A34A" strokeWidth={2} dot={{ r: 3 }} name="Commercial" />
                <Line type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "#F4F4F5" }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className="flex-1 py-1.5 rounded-md text-[12px] font-medium transition-all"
            style={{
              background: activeTab === t.id ? "#FFFFFF" : "transparent",
              color: activeTab === t.id ? "#18181B" : "#71717A",
              boxShadow: activeTab === t.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Product Sales */}
          <div className="card">
            <div className="card-section">
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Product-wise Sales (This Month)</p>
            </div>
            <div className="p-4">
              {productSales.length === 0 ? (
                <p className="text-[13px] text-center py-8" style={{ color: "#A1A1AA" }}>No sales data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={productSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717A" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                    <Tooltip />
                    <Bar dataKey="qty" fill="#2563EB" name="Qty" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expense breakdown pie */}
          <div className="card">
            <div className="card-section">
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Expense Breakdown</p>
            </div>
            <div className="p-4">
              {pieData.length === 0 ? (
                <p className="text-[13px] text-center py-8" style={{ color: "#A1A1AA" }}>No expenses recorded</p>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(v as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1 flex-1">
                    {pieData.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px]">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate" style={{ color: "#52525B" }}>{item.name}</span>
                        <span className="ml-auto font-medium" style={{ color: "#18181B" }}>{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* P&L Summary */}
          {plSummary && (
            <div className="card lg:col-span-2">
              <div className="card-section">
                <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>P&L Summary — This Month</p>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Domestic Revenue", value: plSummary.domesticRevenue, color: "#2563EB" },
                  { label: "Commercial Revenue", value: plSummary.commercialRevenue, color: "#0891B2" },
                  { label: "Cost of Goods", value: plSummary.totalCOGS, color: "#D97706" },
                  { label: "Gross Profit", value: plSummary.grossProfit, color: "#16A34A" },
                  { label: "Total Expenses", value: plSummary.totalExpenses, color: "#DC2626" },
                  { label: "Net Profit", value: plSummary.netProfit, color: plSummary.netProfit >= 0 ? "#16A34A" : "#DC2626" },
                  { label: "Gross Margin", value: `${plSummary.grossMargin}%`, color: "#7C3AED", isText: true },
                  { label: "Net Margin", value: `${plSummary.netMargin}%`, color: plSummary.netMargin >= 0 ? "#16A34A" : "#DC2626", isText: true },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 rounded-lg" style={{ background: item.color + "08" }}>
                    <p className="text-[11px] mb-1" style={{ color: "#71717A" }}>{item.label}</p>
                    <p className="text-[16px] font-bold" style={{ color: item.color }}>
                      {(item as { isText?: boolean }).isText ? item.value : formatCurrency(item.value as number)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "delivery" && (
        <div className="card">
          <div className="card-section">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Delivery Boy Performance (This Month)</p>
          </div>
          {deliveryPerf.length === 0 ? (
            <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No delivery data this month</div>
          ) : (
            <div className="p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deliveryPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#52525B" }} width={100} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="delivered" fill="#2563EB" name="Delivered" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="target" fill="#E4E4E7" name="Target" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <table className="table mt-4">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Delivered</th>
                    <th>Target</th>
                    <th>Achievement</th>
                    <th>Cash Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryPerf.map((d, i) => (
                    <tr key={i}>
                      <td className="font-medium">{d.name}</td>
                      <td>{d.delivered}</td>
                      <td>{d.target || "—"}</td>
                      <td>
                        {d.achievement !== null ? (
                          <span className="badge" style={{
                            background: d.achievement >= 100 ? "#DCFCE7" : d.achievement >= 75 ? "#FEF9C3" : "#FEE2E2",
                            color: d.achievement >= 100 ? "#15803D" : d.achievement >= 75 ? "#854D0E" : "#B91C1C",
                          }}>
                            {d.achievement}%
                          </span>
                        ) : "—"}
                      </td>
                      <td>{formatCurrency(d.cashCollected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "customers" && (
        <div className="card">
          <div className="card-section">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Top 10 Customers (Last 3 Months)</p>
          </div>
          {topCustomers.length === 0 ? (
            <div className="p-8 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No customer data</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Cylinders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{
                        background: i === 0 ? "#FEF9C3" : i === 1 ? "#F4F4F5" : i === 2 ? "#FED7AA" : "#F4F4F5",
                        color: i === 0 ? "#854D0E" : "#52525B",
                      }}>
                        #{i + 1}
                      </span>
                    </td>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.qty}</td>
                    <td className="font-semibold" style={{ color: "#16A34A" }}>{formatCurrency(c.cash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "inventory" && (
        <div className="card">
          <div className="card-section">
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Inventory Turnover (Last 3 Months)</p>
          </div>
          <div className="p-4">
            {inventory.length === 0 ? (
              <p className="text-[13px] text-center py-8" style={{ color: "#A1A1AA" }}>No inventory data</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inventory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inflow" fill="#2563EB" name="Stock In" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outflow" fill="#16A34A" name="Stock Out (Sales)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
