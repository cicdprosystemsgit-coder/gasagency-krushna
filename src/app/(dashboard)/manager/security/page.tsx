import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TwoFactorSecurityView } from "@/components/auth/TwoFactorSecurityView";

export default async function ManagerSecurityPage() {
  const session = await getSession();
  if (!session || session.role !== "MANAGER") redirect("/login");

  return <TwoFactorSecurityView roleName="Manager" userName={session.name} />;
}
