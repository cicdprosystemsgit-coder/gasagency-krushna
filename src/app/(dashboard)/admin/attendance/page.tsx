import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTodayAttendanceSummary } from "@/app/actions/attendance";
import { AttendancePageClient } from "./AttendancePageClient";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await getSessionWithFeatures();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    redirect("/login");
  }

  const { date } = await searchParams;
  const selectedDate = date || new Date().toISOString().split("T")[0];

  const today = await getTodayAttendanceSummary(selectedDate);

  // Get employees for manual entry
  const employees = await prisma.user.findMany({
    where: { agencyId: session.agencyId, isActive: true, role: { not: "SYSTEM_ADMIN" } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Get regularizations
  const regularizations = await prisma.attendanceRegularization.findMany({
    where: { agencyId: session.agencyId },
    include: {
      employee: { select: { name: true, role: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get work shifts
  const shifts = await prisma.workShift.findMany({
    where: { agencyId: session.agencyId },
    orderBy: { name: "asc" },
  });

  // Get current month attendance
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthAttendance = await prisma.attendance.findMany({
    where: {
      agencyId: session.agencyId,
      date: { gte: startOfMonth },
    },
    select: {
      id: true,
      employeeId: true,
      date: true,
      status: true,
      punchIn: true,
      punchOut: true,
    },
    orderBy: { date: "asc" },
  });

  return (
    <AttendancePageClient
      todayData={today.data ?? []}
      employees={employees}
      selectedDate={selectedDate}
      regularizations={JSON.parse(JSON.stringify(regularizations))}
      shifts={JSON.parse(JSON.stringify(shifts))}
      monthAttendance={JSON.parse(JSON.stringify(monthAttendance))}
    />
  );
}