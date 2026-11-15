import { NextRequest, NextResponse } from "next/server";
import { getSession, verifySession } from "@/lib/auth";
import { fetchMySalaryData } from "@/lib/fetchMySalaryData";

export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
  let session = await getSession();
  if (!session) {
    const auth = req.headers.get("Authorization");
    if (auth?.startsWith("Bearer ")) {
      session = await verifySession(auth.slice(7));
    }
  }
  return session;
}

/**
 * GET /api/salary
 * Returns employee's salary profile, drawings, advances, bonuses, and payment requests
 */
export async function GET(req: NextRequest) {
  const session = await getAuth(req);
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchMySalaryData(session.userId, session.agencyId);
    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/salary]", err);
    return NextResponse.json({ error: "Failed to load salary data" }, { status: 500 });
  }
}
