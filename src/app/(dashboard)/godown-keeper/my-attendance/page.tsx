import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyAttendanceHistory } from "@/app/actions/attendance";
import { AttendanceCalendar } from "@/components/attendance/AttendanceCalendar";

export default async function MyAttendancePage() {
  const session = await getSession();
  if (!session || !session.agencyId) {
    redirect("/login");
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const history = await getMyAttendanceHistory(currentMonth, currentYear);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight" style={{ color: "#18181B" }}>
          My Attendance
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: "#71717A" }}>
          Track your monthly clock-in history and request corrections.
        </p>
      </div>

      <AttendanceCalendar
        initialRecords={history.data ?? []}
        userId={session.userId}
      />
    </div>
  );
}
