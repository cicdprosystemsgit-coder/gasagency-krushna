import { getCustomerPortalData } from "@/app/actions/customer-portal";
import { notFound } from "next/navigation";
import { CustomerPortalClient } from "./CustomerPortalClient";

export default async function CustomerPortalPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await getCustomerPortalData(code);

  if ("error" in data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F4F4F5" }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-[18px] font-bold mb-2" style={{ color: "#18181B" }}>Customer Not Found</h1>
          <p className="text-[14px]" style={{ color: "#71717A" }}>{data.error}</p>
        </div>
      </div>
    );
  }

  return <CustomerPortalClient data={data} customerCode={code} />;
}
