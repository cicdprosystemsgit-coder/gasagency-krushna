import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { ClipboardCheck } from "lucide-react";
import { StockRegisterClient } from "@/app/(dashboard)/admin/stock/StockRegisterClient";
import { getDailyStockRegisterData } from "@/app/actions/daily-stock-register";
import { naturalSortCompare } from "@/lib/utils";
import { checkPermission } from "@/lib/rbac";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function GodownKeeperStockPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "GODOWN_KEEPER") redirect("/login");
  requireFeature(session, "stock");

  const isAllowed = await checkPermission(session.userId, "stock", "read");
  if (!isAllowed) redirect("/godown-keeper");

  const resolvedParams = await searchParams;
  const targetDate = resolvedParams?.date || new Date().toISOString().slice(0, 10);

  const [registerData, products] = await Promise.all([
    getDailyStockRegisterData(targetDate),
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isActive: true, isDeleted: false },
      select: {
        id: true,
        name: true,
        unitCost: true,
        saleRate: true,
        isCylinder: true,
        sortOrder: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasCustomSort = products.some((p) => (p as any).sortOrder !== 0);
  if (!hasCustomSort) {
    products.sort((a, b) => naturalSortCompare(a.name, b.name));
  } else {
    products.sort(
      (a, b) =>
        ((a as any).sortOrder ?? 0) - ((b as any).sortOrder ?? 0) ||
        naturalSortCompare(a.name, b.name)
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock Register & Daily Tally"
        subtitle="Godown cylinder count reconciliation, vehicle loadings, and returned empties"
        icon={<ClipboardCheck className="w-5 h-5 text-blue-600" />}
      />

      <StockRegisterClient
        initialDate={targetDate}
        initialData={registerData as any}
        products={products}
        userRole={session.role}
      />
    </div>
  );
}
