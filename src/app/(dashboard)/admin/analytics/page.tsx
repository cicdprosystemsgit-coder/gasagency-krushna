import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import {
  getRevenueTrend,
  getProductSales,
  getDeliveryBoyPerformance,
  getTopCustomers,
  getPLSummary,
  getInventoryTurnover,
} from "@/app/actions/analytics";
import { AnalyticsDashboardClient } from "./AnalyticsDashboardClient";

interface PageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const { dateFrom, dateTo } = await searchParams;

  const [revenue, productSales, deliveryPerf, topCustomers, plSummary, inventory] =
    await Promise.all([
      getRevenueTrend(6),
      getProductSales(dateFrom, dateTo),
      getDeliveryBoyPerformance(dateFrom, dateTo),
      getTopCustomers(),
      getPLSummary(dateFrom, dateTo),
      getInventoryTurnover(),
    ]);

  return (
    <AnalyticsDashboardClient
      revenue={revenue.data}
      productSales={productSales.data}
      deliveryPerf={deliveryPerf.data}
      topCustomers={topCustomers.data}
      plSummary={plSummary.data}
      inventory={inventory.data}
      initialDateFrom={dateFrom || ""}
      initialDateTo={dateTo || ""}
    />
  );
}