import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ClipboardCheck, Users, Package, ChevronRight, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { checkPermission } from "@/lib/rbac";

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const t = await getTranslations("manager");
  const tDash = await getTranslations("dashboard");
  const tNav = await getTranslations("nav");
  const tRoles = await getTranslations("roles");

  // Enforce permission checks
  const [hasApprovals, hasInventory, hasGodown, hasTxn, hasCustomers, hasExpenses] = await Promise.all([
    checkPermission(session.userId, "approvals", "read"),
    checkPermission(session.userId, "inventory", "read"),
    checkPermission(session.userId, "godown", "read"),
    checkPermission(session.userId, "transactions", "read"),
    checkPermission(session.userId, "customers", "read"),
    checkPermission(session.userId, "expenses", "read"),
  ]);

  const [pendingApprovals, totalStaff, recentSummaries] = await Promise.all([
    hasApprovals
      ? prisma.dailySummary.count({ where: { status: "PENDING", agencyId } })
      : Promise.resolve(0),
    prisma.user.count({ where: { isActive: true, agencyId, role: { notIn: ["ADMIN", "SYSTEM_ADMIN"] } } }),
    hasApprovals
      ? prisma.dailySummary.findMany({
          take: 8, orderBy: { createdAt: "desc" },
          where: { agencyId },
          include: { submittedBy: { select: { name: true, role: true } } },
        })
      : Promise.resolve([]),
  ]);

  const todayCount = recentSummaries.filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString()).length;
  const approvedToday = recentSummaries.filter((s) => s.status === "APPROVED" && new Date(s.createdAt).toDateString() === new Date().toDateString()).length;

  const allModules = [
    { label: tDash("reviewApprovals"), href: "/manager/approvals", badge: pendingApprovals, allowed: hasApprovals },
    { label: tNav("inventory"), href: "/manager/inventory", allowed: hasInventory },
    { label: tNav("godown"), href: "/manager/godown", allowed: hasGodown },
    { label: tNav("commercial_sales"), href: "/manager/commercial-sales", allowed: hasTxn },
    { label: tNav("credit_ledger"), href: "/manager/credit-ledger", allowed: hasCustomers },
    { label: tNav("expenses"), href: "/manager/expenses", allowed: hasExpenses },
  ];

  const allowedModules = allModules.filter(m => m.allowed);

  const hasAnyDashboardStat = hasApprovals || hasTxn;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>{tDash("title")}</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>{formatDate(new Date())} — {tDash("welcome")}, {session.name}</p>
        </div>
        {hasApprovals && pendingApprovals > 0 && (
          <Link href="/manager/approvals" className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
            <ClipboardCheck className="w-3.5 h-3.5" />
            {pendingApprovals} {t("pending")} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {hasAnyDashboardStat && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatsCard title={tDash("reviewApprovals")} value={pendingApprovals} subtitle={t("pendingReview")} icon={<ClipboardCheck className="w-4 h-4" />} color={pendingApprovals > 0 ? "orange" : "green"} />
          <StatsCard title={t("teamMembers")} value={totalStaff} subtitle={t("underManagement")} icon={<Users className="w-4 h-4" />} color="blue" />
          <StatsCard title={t("todaySubmissions")} value={todayCount} subtitle={t("submittedToday")} icon={<Package className="w-4 h-4" />} color="purple" />
          <StatsCard title={t("approvedToday")} value={approvedToday} subtitle={t("reviewedToday")} icon={<ClipboardCheck className="w-4 h-4" />} color="green" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {hasApprovals ? (
          <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
              <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{tDash("recentSubmissions")}</p>
              <Link href="/manager/approvals" className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#2563EB" }}>{tDash("allRoles")} <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <table className="table">
              <thead><tr>
                <th>{tDash("employee")}</th><th>{tDash("role")}</th><th>{tDash("date")}</th><th>{tDash("status")}</th><th></th>
              </tr></thead>
              <tbody>
                {recentSummaries.length === 0 ? (
                  <tr><td colSpan={5} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>{t("noSubmissions")}</td></tr>
                ) : recentSummaries.map((s) => (
                  <tr key={s.id}>
                    <td className="text-[13px] font-medium" style={{ color: "#18181B" }}>{s.submittedBy.name}</td>
                    <td className="muted text-[12px]">{tRoles(s.submittedBy.role as keyof typeof tRoles | any)}</td>
                    <td className="muted text-[12px]">{formatDate(s.date)}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td><Link href={`/manager/approvals?id=${s.id}`} className="text-[12px] font-medium" style={{ color: "#2563EB" }}>{tDash("reviewApprovals")}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="lg:col-span-2 rounded-lg p-6 flex flex-col justify-center items-center gap-3.5 bg-zinc-50 border border-zinc-200">
            <ShieldAlert className="w-6 h-6 text-zinc-400" />
            <div className="text-[13px] text-zinc-500 text-center">
              You do not have permission to view or review daily summary approvals.
            </div>
          </div>
        )}

        <div className="rounded-lg overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>{t("modules")}</p>
          </div>
          {allowedModules.length > 0 ? (
            <div className="p-3 space-y-1 flex-1">
              {allowedModules.map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-zinc-50 group" style={{ color: "#52525B" }}>
                  {a.label}
                  <div className="flex items-center gap-1.5">
                    {a.badge !== undefined && a.badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>{a.badge}</span>}
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#A1A1AA" }} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 flex-1 flex flex-col justify-center items-center gap-2.5 bg-zinc-50">
              <ShieldAlert className="w-5 h-5 text-zinc-400" />
              <div className="text-[12px] text-zinc-500 text-center">
                No accessible modules found.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
