import { prisma } from "../src/lib/prisma";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

function cleanHeader(val: unknown): string {
  if (!val) return "";
  return String(val)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0] || "customers.xlsx";
  const agencyIdArg = args[1];

  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found at: ${resolvedPath}`);
    console.log("Usage: npx tsx scripts/import-customers.ts <path-to-file.xlsx> [agencyId]");
    process.exit(1);
  }

  let agencyId = agencyIdArg;
  if (!agencyId) {
    const firstAgency = await prisma.agency.findFirst({ select: { id: true, name: true } });
    if (!firstAgency) {
      console.error("❌ No Agency found in database. Please provide an agencyId.");
      process.exit(1);
    }
    agencyId = firstAgency.id;
    console.log(`ℹ️  No agencyId specified. Using default agency: "${firstAgency.name}" (${agencyId})`);
  }

  console.log(`📂 Reading Excel file: ${resolvedPath}...`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(resolvedPath);

  const worksheet = workbook.worksheets[0];
  console.log(`📊 Worksheet "${worksheet.name}" has ${worksheet.rowCount} total rows.`);

  let headerRowIdx = 1;
  let foundHeaders = false;
  const colMap: {
    srNo?: number;
    consumerNo?: number;
    name?: number;
    address?: number;
    area?: number;
    type?: number;
    phone?: number;
  } = {};

  worksheet.eachRow((row, rowIdx) => {
    if (rowIdx > 10 || foundHeaders) return;
    const cleanHeaders = ((row.values as Array<unknown>) || []).map(cleanHeader);

    const hasConsumer = cleanHeaders.some((h) => h.includes("consumer") || h.includes("connection") || h.includes("custcode"));
    const hasName = cleanHeaders.some((h) => h.includes("name") || h.includes("party"));

    if (hasConsumer || hasName) {
      headerRowIdx = rowIdx;
      foundHeaders = true;

      cleanHeaders.forEach((h, idx) => {
        if (!h || idx === 0) return;
        if (h === "srno" || h === "sr" || h === "sno" || h === "slno" || h === "index") {
          colMap.srNo = idx;
        } else if (h === "customertype" || h === "custtype" || h === "type" || h === "category") {
          colMap.type = idx;
        } else if (h.includes("mobile") || h.includes("phone") || h.includes("contact")) {
          colMap.phone = idx;
        } else if (h.includes("area") || h.includes("route") || h.includes("village") || h.includes("locality")) {
          colMap.area = idx;
        } else if (h.includes("address") || h.includes("addr") || h.includes("street")) {
          colMap.address = idx;
        } else if (h.includes("consumer") || h.includes("connection") || h.includes("custcode") || h.includes("customercode")) {
          colMap.consumerNo = idx;
        } else if ((h.includes("name") || h.includes("party") || h.includes("customer")) && !h.includes("type") && !h.includes("code")) {
          colMap.name = idx;
        }
      });
    }
  });

  if (!colMap.consumerNo || !colMap.name) {
    colMap.srNo = colMap.srNo ?? 1;
    colMap.consumerNo = colMap.consumerNo ?? 2;
    colMap.name = colMap.name ?? 3;
    colMap.address = colMap.address ?? 4;
    colMap.area = colMap.area ?? 5;
    colMap.type = colMap.type ?? 6;
    colMap.phone = colMap.phone ?? 7;
  }

  console.log("🗺️ Column mapping identified:", colMap);

  const customersToInsert: Array<{
    name: string;
    phone: string;
    address: string | null;
    areaRoute: string | null;
    type: "DOMESTIC" | "COMMERCIAL";
    customerCode: string;
    agencyId: string;
    isActive: boolean;
    isDeleted: boolean;
  }> = [];

  const seen = new Set<string>();

  worksheet.eachRow((row, rowIdx) => {
    if (foundHeaders && rowIdx <= headerRowIdx) return;

    const getVal = (colIdx?: number) => {
      if (!colIdx) return "";
      const cell = row.getCell(colIdx);
      if (!cell || cell.value === null || cell.value === undefined) return "";
      if (typeof cell.value === "object" && "text" in cell.value) {
        return String(cell.value.text ?? "").trim();
      }
      return String(cell.value ?? "").trim();
    };

    let consumerNo = getVal(colMap.consumerNo);
    let name = getVal(colMap.name);
    const address = getVal(colMap.address);
    const areaRoute = getVal(colMap.area);
    const rawType = getVal(colMap.type).toUpperCase();
    const phone = getVal(colMap.phone);

    if (rowIdx === 1 && (name.toLowerCase() === "customer name" || consumerNo.toLowerCase() === "consumer number")) return;
    if (!name || name === "null" || name === "undefined") return;
    if (!consumerNo || consumerNo === "null") consumerNo = `CUST-${rowIdx}`;
    if (seen.has(consumerNo)) return;
    seen.add(consumerNo);

    const isComm = rawType.includes("COMM") || rawType.includes("HOTEL") || rawType.includes("REST");
    const type = isComm ? "COMMERCIAL" : "DOMESTIC";
    const validPhone = phone && phone.length >= 5 ? phone : consumerNo;

    customersToInsert.push({
      name,
      phone: validPhone,
      address: address || null,
      areaRoute: areaRoute || null,
      type,
      customerCode: consumerNo,
      agencyId,
      isActive: true,
      isDeleted: false,
    });
  });

  console.log(`📦 Parsed ${customersToInsert.length} valid customer rows.`);

  // Check for existing customer codes to support fixing/updating previously mis-imported records
  const existingCustomers = await prisma.customer.findMany({
    where: { agencyId },
    select: { id: true, customerCode: true },
  });

  const existingMap = new Map<string, string>();
  existingCustomers.forEach((c) => {
    if (c.customerCode) existingMap.set(c.customerCode, c.id);
  });

  const toInsert: typeof customersToInsert = [];
  const toUpdate: Array<{ id: string; data: (typeof customersToInsert)[0] }> = [];

  customersToInsert.forEach((c) => {
    const existingId = existingMap.get(c.customerCode);
    if (existingId) {
      toUpdate.push({ id: existingId, data: c });
    } else {
      toInsert.push(c);
    }
  });

  console.log(`ℹ️  Found ${toUpdate.length} existing records to update/fix and ${toInsert.length} new records to insert.`);

  const BATCH_SIZE = 1000;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    const res = await prisma.customer.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += res.count;
    console.log(`⏳ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${inserted} total inserted)...`);
  }

  let updated = 0;
  const UPDATE_BATCH = 250;
  for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH) {
    const chunk = toUpdate.slice(i, i + UPDATE_BATCH);
    await prisma.$transaction(
      chunk.map((item) =>
        prisma.customer.update({
          where: { id: item.id },
          data: {
            name: item.data.name,
            phone: item.data.phone,
            address: item.data.address,
            areaRoute: item.data.areaRoute,
            type: item.data.type,
            isActive: true,
            isDeleted: false,
          },
        })
      )
    );
    updated += chunk.length;
    console.log(`🔄 Updated/Fixed batch ${Math.floor(i / UPDATE_BATCH) + 1} (${updated} total updated)...`);
  }

  console.log(`✅ Finished! Total inserted: ${inserted}, Total updated/fixed: ${updated}`);
}

main().catch((err) => {
  console.error("❌ Fatal error in import script:", err);
  process.exit(1);
});
