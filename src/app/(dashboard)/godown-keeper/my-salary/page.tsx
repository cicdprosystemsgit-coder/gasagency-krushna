import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wallet } from "lucide-react";
import { MySalaryClient } from "@/components/salary/MySalaryClient";
import { fetchMySalaryData } from "@/lib/fetchMySalaryData";

export const metadata = { title: "My Salary | GasAgency" };

export default async function GodownKeeperMySalaryPage() {
  const session = await getSession();
  if (!session || session.role !== "GODOWN_KEEPER" || !session.agencyId) redirect("/login");

  const { profile, drawings, advances, bonuses, agency } = await fetchMySalaryData(session.userId, session.agencyId);

  return (
    <div>
      <PageHeader
        title="My Salary"
        subtitle="Your personal salary, advances, and bonus history"
        icon={<Wallet className="w-5 h-5" />}
      />
      <MySalaryClient
        profile={profile}
        drawings={drawings}
        advances={advances}
        bonuses={bonuses}
        employeeName={session.name ?? ""}
        agencyName={agency?.name ?? ""}
        agencyAddress={[agency?.address, agency?.city, agency?.state].filter(Boolean).join(", ")}
        agencyPhone={agency?.phone ?? ""}
        agencyGstin={agency?.gstin ?? ""}
      />
    </div>
  );
}
