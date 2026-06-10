import { getSession } from "@/lib/auth";
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

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const [revenue, productSales, deliveryPerf, topCustomers, plSummary, inventory] =
    await Promise.all([
      getRevenueTrend(6),
      getProductSales(),
      getDeliveryBoyPerformance(),
      getTopCustomers(),
      getPLSummary(),
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
    />
  );
}
