import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 1) {
      return NextResponse.json({ customers: [] });
    }

    const cleanQ = q.replace(/[\s\-_]/g, "");

    // Quick indexed search
    const customers = await prisma.customer.findMany({
      where: {
        agencyId: session.agencyId,
        isActive: true,
        isDeleted: false,
        OR: [
          { customerCode: { contains: q, mode: "insensitive" } },
          { customerCode: { contains: cleanQ, mode: "insensitive" } },
          { phone: { contains: cleanQ } },
          { name: { contains: q, mode: "insensitive" } },
          { address: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        type: true,
        customerCode: true,
        contactPerson: true,
        businessType: true,
      },
      take: 15,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json({ error: "Failed to search customers" }, { status: 500 });
  }
}
