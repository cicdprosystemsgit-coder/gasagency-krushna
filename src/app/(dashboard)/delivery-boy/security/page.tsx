import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TwoFactorSecurityView } from "@/components/auth/TwoFactorSecurityView";

export default async function DeliveryBoySecurityPage() {
  const session = await getSession();
  if (!session || session.role !== "DELIVERY_BOY") redirect("/login");

  return <TwoFactorSecurityView roleName="Delivery Boy" userName={session.name} />;
}
