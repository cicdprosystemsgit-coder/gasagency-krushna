import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTodayAttendanceSummary } from "@/app/actions/attendance";
import { AttendancePageClient } from "./AttendancePageClient";

export default async function AttendancePage() {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const today = await getTodayAttendanceSummary();

  // Get employees for manual entry
  const employees = await prisma.user.findMany({
    where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <AttendancePageClient
      todayData={today.data ?? []}
      employees={employees}
    />
  );
}
