import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TwoFactorSecurityView } from "@/components/auth/TwoFactorSecurityView";

export default async function GodownKeeperSecurityPage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER") redirect("/login");

  return <TwoFactorSecurityView roleName="Godown Keeper" userName={session.name} />;
}
