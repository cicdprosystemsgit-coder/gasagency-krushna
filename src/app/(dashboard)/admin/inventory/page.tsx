import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Boxes, Package } from "lucide-react";
import { InventoryClient } from "./InventoryClient";
import { OfficeInventorySection } from "@/components/ui/OfficeInventorySection";

export default async function InventoryPage() {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role)) redirect("/login");
  requireFeature(session, "inventory");

  const isAdmin = session.role === "ADMIN";

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [products, allGodownMovements, latestStockRecords, deliveries, commercialSales] = await Promise.all([
    prisma.product.findMany({
      where: { agencyId: session.agencyId!, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.godownInventory.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { date: "desc" },
      include: {
        product: { select: { id: true, name: true, unitCost: true, saleRate: true, isCylinder: true } },
        recordedBy: { select: { name: true } },
      },
    }),
    prisma.stockRecord.findMany({
      where: { agencyId: session.agencyId! },
      orderBy: { date: "desc" },
    }),
    prisma.deliveryRecord.findMany({
      where: { agencyId: session.agencyId!, date: { gte: startOfMonth } },
      select: {
        productId: true,
        deliveredQty: true,
        cashCollected: true,
        product: { select: { name: true, unitCost: true, saleRate: true } },
      },
    }),
    prisma.commercialSale.findMany({
      where: { agencyId: session.agencyId!, date: { gte: startOfMonth } },
      select: {
        productId: true,
        qty: true,
        amount: true,
        product: { select: { name: true, unitCost: true, saleRate: true } },
      },
    }),
  ]);

  const godownMovements = allGodownMovements.filter(gm => !gm.product.isCylinder);

  // Map of product ID -> latest stock record closingStock
  const latestStockMap = new Map<string, number>();
  latestStockRecords.forEach((sr) => {
    if (!latestStockMap.has(sr.productId)) {
      latestStockMap.set(sr.productId, sr.closingStock);
    }
  });

  // Calculate Godown stock levels
  const godownStockMap = new Map<string, number>();
  allGodownMovements.forEach((gm) => {
    const cur = godownStockMap.get(gm.productId) ?? 0;
    if (gm.moveType === "RECEIVED") {
      godownStockMap.set(gm.productId, cur + gm.qty);
    } else {
      godownStockMap.set(gm.productId, Math.max(0, cur - gm.qty));
    }
  });

  // Catalog valuations
  let catalogCostValue = 0;
  let catalogSaleValue = 0;

  // Godown valuations
  let godownStockTotal = 0;
  let godownStockCost = 0;
  let godownStockSale = 0;

  // Office valuations
  let officeStockTotal = 0;
  let officeStockCost = 0;
  let officeStockSale = 0;

  const stockValuationList = products.map((p) => {
    const officeStock = latestStockMap.get(p.id) ?? 0;
    const godownStock = godownStockMap.get(p.id) ?? 0;
    const totalStock = officeStock + godownStock;

    catalogCostValue += p.unitCost;
    catalogSaleValue += p.saleRate;

    godownStockTotal += godownStock;
    godownStockCost += godownStock * p.unitCost;
    godownStockSale += godownStock * p.saleRate;

    officeStockTotal += officeStock;
    officeStockCost += officeStock * p.unitCost;
    officeStockSale += officeStock * p.saleRate;

    return {
      productId: p.id,
      productName: p.name,
      unitCost: p.unitCost,
      saleRate: p.saleRate,
      officeStock,
      godownStock,
      officeCostValuation: officeStock * p.unitCost,
      godownCostValuation: godownStock * p.unitCost,
      totalStock,
      totalCostValuation: totalStock * p.unitCost,
      totalSaleValuation: totalStock * p.saleRate,
    };
  });

  // Sales map grouping
  const salesMap = new Map<string, { productName: string; qtySold: number; revenue: number; cogs: number }>();
  
  deliveries.forEach((d) => {
    if (!salesMap.has(d.productId)) {
      salesMap.set(d.productId, { productName: d.product.name, qtySold: 0, revenue: 0, cogs: 0 });
    }
    const val = salesMap.get(d.productId)!;
    val.qtySold += d.deliveredQty;
    val.revenue += d.cashCollected;
    val.cogs += d.deliveredQty * d.product.unitCost;
  });

  commercialSales.forEach((c) => {
    if (!salesMap.has(c.productId)) {
      salesMap.set(c.productId, { productName: c.product.name, qtySold: 0, revenue: 0, cogs: 0 });
    }
    const val = salesMap.get(c.productId)!;
    val.qtySold += c.qty;
    val.revenue += c.amount;
    val.cogs += c.qty * c.product.unitCost;
  });

  let salesTotalQty = 0;
  let salesTotalRevenue = 0;
  let salesTotalCOGS = 0;

  const salesList = Array.from(salesMap.entries()).map(([productId, s]) => {
    salesTotalQty += s.qtySold;
    salesTotalRevenue += s.revenue;
    salesTotalCOGS += s.cogs;

    return {
      productId,
      productName: s.productName,
      qtySold: s.qtySold,
      revenue: s.revenue,
      cogs: s.cogs,
      profit: s.revenue - s.cogs,
    };
  });

  const dashboardData = {
    catalogCount: products.length,
    catalogCostValue,
    catalogSaleValue,

    godownStockTotal,
    godownStockCost,
    godownStockSale,

    officeStockTotal,
    officeStockCost,
    officeStockSale,

    salesTotalQty,
    salesTotalRevenue,
    salesTotalCOGS,

    stockValuationList,
    salesList,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle={isAdmin ? "Add, edit and delete products · View stock received from godown" : "View product catalog and godown stock"}
        icon={<Boxes className="w-5 h-5" />}
      />

      {/* ── Product Catalog section ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #E4E4E7", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Section header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F4F4F5", background: "#FAFAFA" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
            <Package className="w-4 h-4" style={{ color: "#2563EB" }} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: "#18181B" }}>Product Catalog</p>
            <p className="text-[12px]" style={{ color: "#71717A" }}>
              {isAdmin ? "Add, edit, or remove products from your agency catalog" : "View your product catalog and pricing"}
            </p>
          </div>
        </div>
        <div className="p-5">
          <InventoryClient initialProducts={products} isAdmin={isAdmin} dashboardData={dashboardData} />
        </div>
      </div>

      {/* ── Godown stock received section ── */}
      <OfficeInventorySection movements={godownMovements as Parameters<typeof OfficeInventorySection>[0]["movements"]} />
    </div>
  );
}