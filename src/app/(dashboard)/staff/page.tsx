import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/ui/StatsCard";
import { PunchWidget } from "@/components/ui/PunchWidget";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Receipt, ShoppingCart, CreditCard, FileText, ArrowRight, Boxes } from "lucide-react";
import Link from "next/link";

export default async function StaffDashboard() {
  const session = await getSession();
  if (!session || session.role !== "STAFF" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const [todayTxns, todaySales] = await Promise.all([
    prisma.officeTransaction.findMany({ where: { addedById: session.userId, agencyId, date: { gte: todayStart, lte: todayEnd } } }),
    prisma.commercialSale.findMany({ where: { addedById: session.userId, agencyId, date: { gte: todayStart, lte: todayEnd } } }),
  ]);

  const txnTotal = todayTxns.reduce((a, t) => a + t.amount, 0);
  const salesTotal = todaySales.reduce((a, s) => a + s.amount, 0);

  const modules = [
    { label: "Office Transactions", href: "/staff/office-transactions", icon: <Receipt className="w-4 h-4" />, desc: "New connections, regulators, pipe fittings" },
    { label: "Commercial Sales", href: "/staff/commercial-sales", icon: <ShoppingCart className="w-4 h-4" />, desc: "Hotels, restaurants, bulk customers" },
    { label: "Credit Ledger", href: "/staff/credit-ledger", icon: <CreditCard className="w-4 h-4" />, desc: "Udhari and payment tracking" },
    { label: "GST Invoicing", href: "/staff/gst-invoicing", icon: <FileText className="w-4 h-4" />, desc: "Generate GST bills" },
    { label: "Office Stock", href: "/staff/inventory", icon: <Boxes className="w-4 h-4" />, desc: "Products received from godown" },
  ];

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Dashboard</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>{formatDate(new Date())} — Hello, {session.name}</p>
      </div>
      <PunchWidget />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard title="Office Transactions" value={todayTxns.length} subtitle={formatCurrency(txnTotal)} icon={<Receipt className="w-4 h-4" />} color="blue" />
        <StatsCard title="Commercial Sales" value={todaySales.length} subtitle={formatCurrency(salesTotal)} icon={<ShoppingCart className="w-4 h-4" />} color="green" />
        <StatsCard title="Total Today" value={formatCurrency(txnTotal + salesTotal)} subtitle="All transactions" icon={<ArrowRight className="w-4 h-4" />} color="purple" />
        <StatsCard title="Transactions" value={todayTxns.length + todaySales.length} subtitle="Combined today" icon={<Receipt className="w-4 h-4" />} color="orange" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-lg p-4 transition-colors hover:bg-zinc-50 group"
            style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: "#EFF6FF", color: "#2563EB" }}>
              {m.icon}
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: "#18181B" }}>{m.label}</p>
            <p className="text-[12px]" style={{ color: "#A1A1AA" }}>{m.desc}</p>
            <div className="flex items-center gap-1 mt-3 text-[12px] font-medium" style={{ color: "#2563EB" }}>
              Open <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
