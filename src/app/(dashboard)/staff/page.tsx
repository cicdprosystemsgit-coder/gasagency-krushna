import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/ui/StatsCard";
import { PunchWidget } from "@/components/ui/PunchWidget";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Receipt, ShoppingCart, CreditCard, FileText, ArrowRight, Boxes, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { checkPermission } from "@/lib/rbac";

export default async function StaffDashboard() {
  const session = await getSession();
  if (!session || session.role !== "STAFF" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const t = await getTranslations("staff");
  const tNav = await getTranslations("nav");
  const tDash = await getTranslations("dashboard");

  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  // Enforce permission checks
  const [hasTxnPermission, hasCustomersPermission, hasGstPermission, hasInventoryPermission] = await Promise.all([
    checkPermission(session.userId, "transactions", "read"),
    checkPermission(session.userId, "customers", "read"),
    checkPermission(session.userId, "gstInvoices", "read"),
    checkPermission(session.userId, "inventory", "read"),
  ]);

  const [todayTxns, todaySales] = await Promise.all([
    hasTxnPermission
      ? prisma.officeTransaction.findMany({ where: { addedById: session.userId, agencyId, date: { gte: todayStart, lte: todayEnd } } })
      : Promise.resolve([]),
    hasTxnPermission
      ? prisma.commercialSale.findMany({ where: { addedById: session.userId, agencyId, date: { gte: todayStart, lte: todayEnd } } })
      : Promise.resolve([]),
  ]);

  const txnTotal = todayTxns.reduce((a, t) => a + t.amount, 0);
  const salesTotal = todaySales.reduce((a, s) => a + s.amount, 0);

  const allModules = [
    { label: tNav("office_transactions"), href: "/staff/office-transactions", icon: <Receipt className="w-4 h-4" />, desc: t("officeTxnsDesc"), allowed: hasTxnPermission },
    { label: tNav("commercial_sales"), href: "/staff/commercial-sales", icon: <ShoppingCart className="w-4 h-4" />, desc: t("commSalesDesc"), allowed: hasTxnPermission },
    { label: tNav("credit_ledger"), href: "/staff/credit-ledger", icon: <CreditCard className="w-4 h-4" />, desc: t("creditLedgerDesc"), allowed: hasCustomersPermission },
    { label: tNav("gst_invoicing"), href: "/staff/gst-invoicing", icon: <FileText className="w-4 h-4" />, desc: t("gstInvoicingDesc"), allowed: hasGstPermission },
    { label: tNav("inventory"), href: "/staff/inventory", icon: <Boxes className="w-4 h-4" />, desc: t("officeStockDesc"), allowed: hasInventoryPermission },
  ];

  const allowedModules = allModules.filter(m => m.allowed);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>{tDash("title")}</h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>{formatDate(new Date())} — {t("hello")}, {session.name}</p>
      </div>
      <PunchWidget />

      {hasTxnPermission && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatsCard title={tNav("office_transactions")} value={todayTxns.length} subtitle={formatCurrency(txnTotal)} icon={<Receipt className="w-4 h-4" />} color="blue" />
          <StatsCard title={tNav("commercial_sales")} value={todaySales.length} subtitle={formatCurrency(salesTotal)} icon={<ShoppingCart className="w-4 h-4" />} color="green" />
          <StatsCard title={t("totalToday")} value={formatCurrency(txnTotal + salesTotal)} subtitle={t("allTransactions")} icon={<ArrowRight className="w-4 h-4" />} color="purple" />
          <StatsCard title={t("transactionsCount")} value={todayTxns.length + todaySales.length} subtitle={t("combinedToday")} icon={<Receipt className="w-4 h-4" />} color="orange" />
        </div>
      )}

      {allowedModules.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allowedModules.map((m) => (
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
                {t("open")} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-6 flex items-center gap-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
          <ShieldAlert className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="text-[13px] text-zinc-500">
            You do not have access to any office features. Please contact your agency administrator to update your role permissions.
          </div>
        </div>
      )}
    </div>
  );
}
