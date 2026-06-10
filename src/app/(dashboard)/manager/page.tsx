import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StatsCard } from "@/components/ui/StatsCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ClipboardCheck, Users, Package, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function ManagerDashboard() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER" || !session.agencyId) redirect("/login");
  const agencyId = session.agencyId;

  const [pendingApprovals, totalStaff, recentSummaries] = await Promise.all([
    prisma.dailySummary.count({ where: { status: "PENDING", agencyId } }),
    prisma.user.count({ where: { isActive: true, agencyId, role: { notIn: ["ADMIN", "SYSTEM_ADMIN"] } } }),
    prisma.dailySummary.findMany({
      take: 8, orderBy: { createdAt: "desc" },
      where: { agencyId },
      include: { submittedBy: { select: { name: true, role: true } } },
    }),
  ]);

  const todayCount = recentSummaries.filter((s) => new Date(s.createdAt).toDateString() === new Date().toDateString()).length;
  const approvedToday = recentSummaries.filter((s) => s.status === "APPROVED" && new Date(s.createdAt).toDateString() === new Date().toDateString()).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>Dashboard</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>{formatDate(new Date())} — Welcome back, {session.name}</p>
        </div>
        {pendingApprovals > 0 && (
          <Link href="/manager/approvals" className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
            <ClipboardCheck className="w-3.5 h-3.5" />
            {pendingApprovals} pending <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatsCard title="Pending Approvals" value={pendingApprovals} subtitle="Need your review" icon={<ClipboardCheck className="w-4 h-4" />} color={pendingApprovals > 0 ? "orange" : "green"} />
        <StatsCard title="Team Members" value={totalStaff} subtitle="Under your management" icon={<Users className="w-4 h-4" />} color="blue" />
        <StatsCard title="Today's Submissions" value={todayCount} subtitle="Submitted today" icon={<Package className="w-4 h-4" />} color="purple" />
        <StatsCard title="Approved Today" value={approvedToday} subtitle="Reviewed today" icon={<ClipboardCheck className="w-4 h-4" />} color="green" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Recent submissions</p>
            <Link href="/manager/approvals" className="flex items-center gap-1 text-[12px] font-medium" style={{ color: "#2563EB" }}>View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <table className="table">
            <thead><tr>
              <th>Employee</th><th>Role</th><th>Date</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {recentSummaries.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-[13px]" style={{ color: "#A1A1AA" }}>No submissions yet</td></tr>
              ) : recentSummaries.map((s) => (
                <tr key={s.id}>
                  <td className="text-[13px] font-medium" style={{ color: "#18181B" }}>{s.submittedBy.name}</td>
                  <td className="muted text-[12px]">{s.submittedBy.role.replace(/_/g, " ")}</td>
                  <td className="muted text-[12px]">{formatDate(s.date)}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td><Link href={`/manager/approvals?id=${s.id}`} className="text-[12px] font-medium" style={{ color: "#2563EB" }}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #E4E4E7" }}>
            <p className="text-[13px] font-semibold" style={{ color: "#18181B" }}>Modules</p>
          </div>
          <div className="p-3 space-y-1">
            {[
              { label: "Review approvals", href: "/manager/approvals", badge: pendingApprovals },
              { label: "Inventory", href: "/manager/inventory" },
              { label: "Godown", href: "/manager/godown" },
              { label: "Commercial sales", href: "/manager/commercial-sales" },
              { label: "Credit ledger", href: "/manager/credit-ledger" },
              { label: "Expenses", href: "/manager/expenses" },
            ].map((a) => (
              <Link key={a.href} href={a.href} className="flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors hover:bg-zinc-50 group" style={{ color: "#52525B" }}>
                {a.label}
                <div className="flex items-center gap-1.5">
                  {a.badge !== undefined && a.badge > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "#DC2626" }}>{a.badge}</span>}
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#A1A1AA" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
