import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TwoFactorSecurityView } from "@/components/auth/TwoFactorSecurityView";

export default async function StaffSecurityPage() {
  const session = await getSession();
  if (!session || session.role !== "STAFF") redirect("/login");

  return <TwoFactorSecurityView roleName="Staff" userName={session.name} />;
}
