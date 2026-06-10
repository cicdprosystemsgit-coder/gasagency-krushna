import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/search?q=...&types=customers,employees,invoices,transactions
 * Full-text search across customers, employees, GST invoices, and office transactions.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.agencyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const types = searchParams.get("types")?.split(",") ?? ["customers", "employees", "invoices", "transactions"];

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const agencyId = session.agencyId;
  const results: {
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
  }[] = [];

  await Promise.all([
    // Customers
    types.includes("customers") &&
      prisma.customer.findMany({
        where: {
          agencyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { customerCode: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, phone: true, type: true, customerCode: true },
        take: 8,
      }).then((rows) => {
        rows.forEach((c) =>
          results.push({
            type: "customer",
            id: c.id,
            title: c.name,
            subtitle: `${c.type} · ${c.phone ?? ""} ${c.customerCode ? `· ${c.customerCode}` : ""}`.trim(),
            href: `/admin/customer-management`,
          })
        );
      }),

    // Employees
    types.includes("employees") &&
      prisma.user.findMany({
        where: {
          agencyId,
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        },
        select: { id: true, name: true, email: true, role: true },
        take: 8,
      }).then((rows) => {
        rows.forEach((u) =>
          results.push({
            type: "employee",
            id: u.id,
            title: u.name,
            subtitle: `${u.role.replace(/_/g, " ")} · ${u.email}`,
            href: `/admin/staff-management`,
          })
        );
      }),

    // GST Invoices — use customerId + invoiceNo (no customerName field in schema)
    types.includes("invoices") &&
      prisma.gstInvoice.findMany({
        where: {
          agencyId,
          OR: [
            { invoiceNo: { contains: q, mode: "insensitive" } },
            { customerId: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, invoiceNo: true, customerId: true, total: true, date: true },
        orderBy: { date: "desc" },
        take: 8,
      }).then((rows) => {
        rows.forEach((inv) =>
          results.push({
            type: "invoice",
            id: inv.id,
            title: `Invoice ${inv.invoiceNo}`,
            subtitle: `₹${inv.total.toLocaleString("en-IN")} · ${new Date(inv.date).toLocaleDateString("en-IN")}`,
            href: `/admin/gst-invoicing`,
          })
        );
      }),

    // Office Transactions — description only (no category field)
    types.includes("transactions") &&
      prisma.officeTransaction.findMany({
        where: {
          agencyId,
          description: { contains: q, mode: "insensitive" },
        },
        select: { id: true, description: true, amount: true, date: true, type: true },
        orderBy: { date: "desc" },
        take: 8,
      }).then((rows) => {
        rows.forEach((t) =>
          results.push({
            type: "transaction",
            id: t.id,
            title: t.description ?? t.type,
            subtitle: `₹${t.amount.toLocaleString("en-IN")} · ${new Date(t.date).toLocaleDateString("en-IN")}`,
            href: `/admin/office-transactions`,
          })
        );
      }),
  ]);

  // Sort: customers > employees > invoices > transactions
  const ORDER = ["customer", "employee", "invoice", "transaction"];
  results.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

  return NextResponse.json({ results: results.slice(0, 20), query: q });
}
