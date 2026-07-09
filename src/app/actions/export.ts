"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { formatCurrency } from "@/lib/utils";
import { CustomerType } from "@/generated/prisma";

type ExportType = "customers" | "employees" | "deliveries" | "expenses" | "credit-ledger";

// ── Master export function ────────────────────────────────────────────────────
export async function exportToExcel(
  type: ExportType,
  filters: { from?: string; to?: string } = {}
): Promise<{ base64: string; filename: string } | { error: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "GasAgency";
  workbook.created = new Date();

  const dateFilter = filters.from || filters.to
    ? {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      }
    : undefined;

  switch (type) {
    case "customers":
      await buildCustomersSheet(workbook, agencyId);
      break;
    case "employees":
      await buildEmployeesSheet(workbook, agencyId);
      break;
    case "deliveries":
      await buildDeliveriesSheet(workbook, agencyId, dateFilter);
      break;
    case "expenses":
      await buildExpensesSheet(workbook, agencyId, dateFilter);
      break;
    case "credit-ledger":
      await buildCreditLedgerSheet(workbook, agencyId);
      break;
    default:
      return { error: "Unknown export type" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const filename = `gas-agency-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { base64, filename };
}

// ── Sheet builders ────────────────────────────────────────────────────────────
async function buildCustomersSheet(wb: ExcelJS.Workbook, agencyId: string) {
  const ws = wb.addWorksheet("Customers");
  ws.columns = [
    { header: "Code", key: "code", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Type", key: "type", width: 15 },
    { header: "Address", key: "address", width: 35 },
    { header: "Outstanding (₹)", key: "outstanding", width: 18 },
    { header: "Created", key: "created", width: 15 },
  ];

  styleHeaderRow(ws);

  const customers = await prisma.customer.findMany({
    where: { agencyId, isActive: true },
    include: {
      creditEntries: { select: { type: true, amount: true } },
    },
    orderBy: { name: "asc" },
  });

  customers.forEach((c) => {
    const outstanding = c.creditEntries.reduce(
      (sum, e) => sum + (e.type === "CREDIT" ? e.amount : -e.amount),
      0
    );
    ws.addRow({
      code: c.customerCode ?? "",
      name: c.name,
      phone: c.phone ?? "",
      type: c.type,
      address: c.address ?? "",
      outstanding: outstanding.toFixed(2),
      created: c.createdAt.toLocaleDateString("en-IN"),
    });
  });
}

async function buildEmployeesSheet(wb: ExcelJS.Workbook, agencyId: string) {
  const ws = wb.addWorksheet("Employees");
  ws.columns = [
    { header: "Name", key: "name", width: 25 },
    { header: "Role", key: "role", width: 18 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Email", key: "email", width: 28 },
    { header: "Bank", key: "bank", width: 15 },
    { header: "IFSC", key: "ifsc", width: 15 },
    { header: "Joined", key: "joined", width: 15 },
  ];

  styleHeaderRow(ws);

  const users = await prisma.user.findMany({
    where: { agencyId, isActive: true },
    orderBy: { name: "asc" },
  });

  users.forEach((u) => {
    ws.addRow({
      name: u.name,
      role: u.role.replace(/_/g, " "),
      phone: u.phone ?? "",
      email: u.email,
      bank: u.bankName ?? "",
      ifsc: u.ifscCode ?? "",
      joined: u.createdAt.toLocaleDateString("en-IN"),
    });
  });
}

async function buildDeliveriesSheet(
  wb: ExcelJS.Workbook,
  agencyId: string,
  dateFilter?: { gte?: Date; lte?: Date }
) {
  const ws = wb.addWorksheet("Deliveries");
  ws.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Customer", key: "customer", width: 22 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Product", key: "product", width: 18 },
    { header: "Delivered", key: "delivered", width: 12 },
    { header: "Pending", key: "pending", width: 12 },
    { header: "Cash (₹)", key: "cash", width: 14 },
    { header: "Delivery Boy", key: "boy", width: 20 },
  ];

  styleHeaderRow(ws);

  const deliveries = await prisma.deliveryRecord.findMany({
    where: { agencyId, ...(dateFilter ? { date: dateFilter } : {}) },
    include: {
      customer: { select: { name: true, phone: true } },
      product: { select: { name: true } },
      deliveredBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  deliveries.forEach((d) => {
    ws.addRow({
      date: d.date.toLocaleDateString("en-IN"),
      customer: d.customer.name,
      phone: d.customer.phone ?? "",
      product: d.product.name,
      delivered: d.deliveredQty,
      pending: d.pendingQty,
      cash: d.cashCollected.toFixed(2),
      boy: d.deliveredBy.name,
    });
  });

  // Summary row
  const totalRow = ws.addRow({
    date: "TOTAL",
    delivered: deliveries.reduce((s, d) => s + d.deliveredQty, 0),
    cash: deliveries.reduce((s, d) => s + d.cashCollected, 0).toFixed(2),
  });
  totalRow.font = { bold: true };
}

async function buildExpensesSheet(
  wb: ExcelJS.Workbook,
  agencyId: string,
  dateFilter?: { gte?: Date; lte?: Date }
) {
  const ws = wb.addWorksheet("Expenses");
  ws.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Description", key: "desc", width: 30 },
    { header: "Category", key: "cat", width: 20 },
    { header: "Amount (₹)", key: "amount", width: 15 },
    { header: "Added By", key: "by", width: 20 },
  ];

  styleHeaderRow(ws);

  const expenses = await prisma.expense.findMany({
    where: { agencyId, ...(dateFilter ? { date: dateFilter } : {}) },
    include: { addedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  expenses.forEach((e) => {
    ws.addRow({
      date: e.date.toLocaleDateString("en-IN"),
      desc: e.description,
      cat: e.category,
      amount: e.amount.toFixed(2),
      by: e.addedBy.name,
    });
  });

  const totalRow = ws.addRow({
    date: "TOTAL",
    amount: expenses.reduce((s, e) => s + e.amount, 0).toFixed(2),
  });
  totalRow.font = { bold: true };
}

async function buildCreditLedgerSheet(wb: ExcelJS.Workbook, agencyId: string) {
  const ws = wb.addWorksheet("Credit Ledger");
  ws.columns = [
    { header: "Customer", key: "customer", width: 22 },
    { header: "Date", key: "date", width: 15 },
    { header: "Type", key: "type", width: 12 },
    { header: "Amount (₹)", key: "amount", width: 15 },
    { header: "Description", key: "desc", width: 30 },
    { header: "Added By", key: "by", width: 20 },
  ];

  styleHeaderRow(ws);

  const entries = await prisma.creditLedgerEntry.findMany({
    where: { agencyId },
    include: {
      customer: { select: { name: true } },
      addedBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
    take: 5000,
  });

  entries.forEach((e) => {
    ws.addRow({
      customer: e.customer.name,
      date: e.date.toLocaleDateString("en-IN"),
      type: e.type,
      amount: e.amount.toFixed(2),
      desc: e.description ?? "",
      by: e.addedBy.name,
    });
  });
}

// ── Customer import from Excel ────────────────────────────────────────────────
export async function importCustomersFromExcel(
  base64: string
): Promise<{ imported: number; errors: string[] } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(bytes as any);

  const ws = workbook.worksheets[0];
  if (!ws) return { error: "No worksheet found in file" };

  const errors: string[] = [];
  let imported = 0;
  const agencyId = session.agencyId;

  // Expect columns: Name, Phone, Type (DOMESTIC/COMMERCIAL), Address
  const rows: ExcelJS.Row[] = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return; // skip header
    rows.push(row);
  });

  for (const row of rows) {
    const name = String(row.getCell(1).value ?? "").trim();
    const phone = String(row.getCell(2).value ?? "").trim();
    const type = String(row.getCell(3).value ?? "DOMESTIC").trim().toUpperCase();
    const address = String(row.getCell(4).value ?? "").trim();

    if (!name) { errors.push(`Row ${row.number}: name is required`); continue; }
    if (!["DOMESTIC", "COMMERCIAL"].includes(type)) {
      errors.push(`Row ${row.number}: type must be DOMESTIC or COMMERCIAL`); continue;
    }

    try {
      await prisma.customer.create({
        data: { agencyId, name, phone: phone || "", type: type as CustomerType, address: address || undefined, isActive: true },
      });
      imported++;
    } catch {
      errors.push(`Row ${row.number}: duplicate or DB error for "${name}"`);
    }
  }

  return { imported, errors };
}

// ── PDF Export (deliveries or expenses date-range report) ────────────────────
export async function exportToPDF(
  type: "deliveries" | "expenses",
  filters: { from?: string; to?: string } = {}
): Promise<{ base64: string; filename: string } | { error: string }> {
  const session = await getSession();
  if (!session || !["ADMIN", "MANAGER"].includes(session.role) || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const agencyId = session.agencyId;
  const dateFilter = filters.from || filters.to
    ? {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to   ? new Date(filters.to)   : undefined,
      }
    : undefined;

  const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { name: true } });
  const agencyName = agency?.name ?? "Gas Agency";
  const dateLabel  = [filters.from, filters.to].filter(Boolean).join(" to ") || "All time";

  // jsPDF is a client-side lib — we build a raw PDF byte stream server-side
  // by using jspdf with the node-canvas-less path (text only, no images).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { jsPDF } = require("jspdf");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const autoTable = require("jspdf-autotable").default || require("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(agencyName, 14, 18);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${type === "deliveries" ? "Deliveries" : "Expenses"} Report — ${dateLabel}`, 14, 26);
  doc.setDrawColor(24, 24, 27);
  doc.line(14, 29, 283, 29);

  if (type === "deliveries") {
    const rows = await prisma.deliveryRecord.findMany({
      where: { agencyId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: {
        customer:    { select: { name: true, phone: true } },
        product:     { select: { name: true } },
        deliveredBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const body = rows.map((d) => [
      d.date.toLocaleDateString("en-IN"),
      d.customer.name,
      d.customer.phone ?? "",
      d.product.name,
      String(d.deliveredQty),
      String(d.pendingQty),
      formatCurrency(d.cashCollected),
      d.deliveredBy.name,
    ]);

    const totalCash = rows.reduce((s, d) => s + d.cashCollected, 0);

    autoTable(doc, {
      startY: 33,
      head: [["Date", "Customer", "Phone", "Product", "Delivered", "Pending", "Cash (₹)", "Delivery Boy"]],
      body,
      foot: [["", "TOTAL", "", "", String(rows.reduce((s, d) => s + d.deliveredQty, 0)), "", formatCurrency(totalCash), ""]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      footStyles: { fillColor: [244, 244, 245], textColor: [24, 24, 27], fontStyle: "bold" },
    });
  } else {
    const rows = await prisma.expense.findMany({
      where: { agencyId, ...(dateFilter ? { date: dateFilter } : {}) },
      include: { addedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    });

    const body = rows.map((e) => [
      e.date.toLocaleDateString("en-IN"),
      e.description,
      e.category,
      formatCurrency(e.amount),
      e.addedBy.name,
    ]);

    const total = rows.reduce((s, e) => s + e.amount, 0);

    autoTable(doc, {
      startY: 33,
      head: [["Date", "Description", "Category", "Amount (₹)", "Added By"]],
      body,
      foot: [["", "TOTAL", "", formatCurrency(total), ""]],
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [24, 24, 27], textColor: 255 },
      footStyles: { fillColor: [244, 244, 245], textColor: [24, 24, 27], fontStyle: "bold" },
    });
  }

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(`Page ${i} of ${pageCount} — Generated by GasAgency on ${new Date().toLocaleDateString("en-IN")}`, 14, doc.internal.pageSize.height - 8);
  }

  const pdfBytes = doc.output("arraybuffer") as ArrayBuffer;
  const base64 = Buffer.from(pdfBytes).toString("base64");
  const filename = `gas-agency-${type}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return { base64, filename };
}

// ── Opening stock import from Excel ──────────────────────────────────────────
export async function importOpeningStockFromExcel(
  base64: string
): Promise<{ imported: number; errors: string[] } | { error: string }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN" || !session.agencyId) {
    return { error: "Unauthorized" };
  }

  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  const workbook = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(bytes as any);

  const ws = workbook.worksheets[0];
  if (!ws) return { error: "No worksheet found in file" };

  const errors: string[] = [];
  let imported = 0;
  const agencyId = session.agencyId;

  // Look up all products for this agency so we can match by name
  const products = await prisma.product.findMany({
    where: { agencyId, isActive: true },
    select: { id: true, name: true },
  });
  const productByName = new Map(products.map((p) => [p.name.toLowerCase(), p.id]));

  // Expected columns: Product Name, Quantity, Date (optional), Notes (optional)
  const rows: ExcelJS.Row[] = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return; // skip header
    rows.push(row);
  });

  for (const row of rows) {
    const productName = String(row.getCell(1).value ?? "").trim();
    const qtyRaw      = row.getCell(2).value;
    const dateRaw     = row.getCell(3).value;
    const notes       = String(row.getCell(4).value ?? "Opening stock").trim();

    if (!productName) { errors.push(`Row ${row.number}: product name is required`); continue; }

    const productId = productByName.get(productName.toLowerCase());
    if (!productId) {
      errors.push(`Row ${row.number}: product "${productName}" not found — check spelling`); continue;
    }

    const qty = typeof qtyRaw === "number" ? Math.round(qtyRaw) : parseInt(String(qtyRaw ?? ""));
    if (!qty || qty < 1) { errors.push(`Row ${row.number}: invalid quantity`); continue; }

    let date = new Date();
    if (dateRaw instanceof Date) date = dateRaw;
    else if (typeof dateRaw === "string" && dateRaw) {
      const parsed = new Date(dateRaw);
      if (!isNaN(parsed.getTime())) date = parsed;
    }

    try {
      const admin = await prisma.user.findFirst({
        where: { agencyId, role: "ADMIN", isActive: true },
        select: { id: true },
      });
      if (!admin) { errors.push(`Row ${row.number}: no admin user found for agency`); continue; }

      await prisma.godownInventory.create({
        data: {
          date,
          moveType: "RECEIVED",
          productId,
          qty,
          notes: notes || "Opening stock import",
          batchNo: "OPENING",
          recordedById: admin.id,
          agencyId,
        },
      });
      imported++;
    } catch {
      errors.push(`Row ${row.number}: DB error for "${productName}"`);
    }
  }

  return { imported, errors };
}

// ── Styling helper ────────────────────────────────────────────────────────────
function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF18181B" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 20;
}
