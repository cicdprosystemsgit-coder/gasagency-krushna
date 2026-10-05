import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";

export const maxDuration = 300; // 5 minutes for processing 32,000+ records
export const dynamic = "force-dynamic";

function cleanHeader(val: unknown): string {
  if (!val) return "";
  return String(val)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ""); // "Customer Type" -> "customertype", "Area / Route" -> "arearoute"
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAllowed =
      ["ADMIN", "MANAGER"].includes(session.role) ||
      (await checkPermission(session.userId, "customers", "create"));

    if (!isAllowed) {
      return NextResponse.json(
        { error: "Access Denied: You do not have permission to import customers." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No Excel or CSV file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    if (file.name.endsWith(".csv")) {
      const { Readable } = await import("stream");
      const stream = Readable.from(buffer);
      await workbook.csv.read(stream);
    } else {
      // @ts-expect-error ExcelJS types mismatch with Node 20 buffer
      await workbook.xlsx.load(buffer);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    // ── Identify Header Row & Column Mappings ─────────────────────────────────
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
      email?: number;
      gst?: number;
      businessType?: number;
      contactPerson?: number;
    } = {};

    // Scan top 10 rows to detect the real header row
    worksheet.eachRow((row, rowIdx) => {
      if (rowIdx > 10 || foundHeaders) return;

      const rawValues = (row.values as Array<unknown>) || [];
      const cleanHeaders = rawValues.map(cleanHeader);

      // Check if this row looks like a header
      const hasConsumerHeader = cleanHeaders.some(
        (h) =>
          h.includes("consumer") ||
          h.includes("connection") ||
          h.includes("custcode") ||
          h.includes("customercode") ||
          h.includes("svno")
      );
      const hasNameHeader = cleanHeaders.some(
        (h) =>
          (h.includes("name") || h.includes("party") || h.includes("customer")) &&
          !h.includes("type") &&
          !h.includes("code") &&
          !h.includes("phone")
      );
      const hasTypeHeader = cleanHeaders.some((h) => h.includes("type") || h.includes("category"));

      if (hasConsumerHeader || (hasNameHeader && hasTypeHeader)) {
        headerRowIdx = rowIdx;
        foundHeaders = true;

        cleanHeaders.forEach((h, idx) => {
          if (!h || idx === 0) return;

          // 1. Serial No
          if (
            h === "srno" ||
            h === "sr" ||
            h === "sno" ||
            h === "slno" ||
            h === "index" ||
            h === "serialno" ||
            h === "serialnumber"
          ) {
            colMap.srNo = idx;
          }
          // 2. Customer Type (Check before name to avoid 'customertype' matching 'name'/'customer')
          else if (
            h === "customertype" ||
            h === "custtype" ||
            h === "connectiontype" ||
            h === "type" ||
            h === "category"
          ) {
            colMap.type = idx;
          }
          // 3. Mobile / Phone
          else if (
            h.includes("mobile") ||
            h.includes("phone") ||
            h.includes("contactno") ||
            h.includes("contactnumber") ||
            h.includes("cell") ||
            h.includes("whatsapp")
          ) {
            colMap.phone = idx;
          }
          // 4. Area / Route
          else if (
            h.includes("arearoute") ||
            h.includes("area") ||
            h.includes("route") ||
            h.includes("village") ||
            h.includes("locality") ||
            h.includes("colony") ||
            h.includes("sector")
          ) {
            colMap.area = idx;
          }
          // 5. Address (check after area so "area address" goes to address)
          else if (
            h.includes("address") ||
            h.includes("addr") ||
            h.includes("street") ||
            h.includes("location")
          ) {
            colMap.address = idx;
          }
          // 6. Consumer / Connection Number
          else if (
            h.includes("consumer") ||
            h.includes("connection") ||
            h.includes("custcode") ||
            h.includes("customercode") ||
            h.includes("svno") ||
            h === "code" ||
            h === "lpgid"
          ) {
            colMap.consumerNo = idx;
          }
          // 7. Customer / Party Name
          else if (
            (h.includes("name") || h.includes("party") || h.includes("customer")) &&
            !h.includes("type") &&
            !h.includes("code") &&
            !h.includes("area") &&
            !h.includes("route") &&
            !h.includes("phone")
          ) {
            colMap.name = idx;
          }
          // 8. GST
          else if (h.includes("gst") || h.includes("gstin")) {
            colMap.gst = idx;
          }
          // 9. Email
          else if (h.includes("email") || h.includes("mail")) {
            colMap.email = idx;
          }
          // 10. Business Type
          else if (h.includes("business") || h.includes("firm")) {
            colMap.businessType = idx;
          }
          // 11. Contact Person
          else if (h.includes("contactperson") || h.includes("proprietor")) {
            colMap.contactPerson = idx;
          }
        });
      }
    });

    // Positional Fallback if headers were not named or parsed
    if (!colMap.consumerNo || !colMap.name) {
      // Standard layout: [1] SrNo, [2] ConsumerNo, [3] Name, [4] Address, [5] Area/Route, [6] Type, [7] Phone
      colMap.srNo = colMap.srNo ?? 1;
      colMap.consumerNo = colMap.consumerNo ?? 2;
      colMap.name = colMap.name ?? 3;
      colMap.address = colMap.address ?? 4;
      colMap.area = colMap.area ?? 5;
      colMap.type = colMap.type ?? 6;
      colMap.phone = colMap.phone ?? 7;
    }

    // ── Parse Records Row by Row ──────────────────────────────────────────────
    const customersToProcess: Array<{
      name: string;
      phone: string;
      address: string | null;
      areaRoute: string | null;
      type: "DOMESTIC" | "COMMERCIAL";
      customerCode: string;
      email: string | null;
      gstNumber: string | null;
      businessType: string | null;
      contactPerson: string | null;
      agencyId: string;
      isActive: boolean;
      isDeleted: boolean;
    }> = [];

    const seenCodes = new Set<string>();

    worksheet.eachRow((row, rowIdx) => {
      // Skip header row(s)
      if (foundHeaders && rowIdx <= headerRowIdx) return;

      const getVal = (colIdx?: number) => {
        if (!colIdx) return "";
        const cell = row.getCell(colIdx);
        if (!cell || cell.value === null || cell.value === undefined) return "";
        if (typeof cell.value === "object" && "text" in cell.value) {
          return String(cell.value.text ?? "").trim();
        }
        if (typeof cell.value === "object" && "result" in cell.value) {
          return String(cell.value.result ?? "").trim();
        }
        return String(cell.value ?? "").trim();
      };

      let consumerNo = getVal(colMap.consumerNo);
      let name = getVal(colMap.name);
      let address = getVal(colMap.address);
      let areaRoute = getVal(colMap.area);
      let rawType = getVal(colMap.type).toUpperCase();
      let phone = getVal(colMap.phone);
      let email = getVal(colMap.email);
      let gst = getVal(colMap.gst);
      let businessType = getVal(colMap.businessType);
      const contactPerson = getVal(colMap.contactPerson);

      // Skip header text if rowIdx === 1 and not caught earlier
      if (rowIdx === 1 && (name.toLowerCase() === "customer name" || consumerNo.toLowerCase() === "consumer number")) {
        return;
      }

      // Check if name is mistakenly mapped to customer type
      if ((name.toUpperCase() === "DOMESTIC" || name.toUpperCase() === "COMMERCIAL") && !rawType) {
        rawType = name.toUpperCase();
        // If colMap.name was wrong, try cell 3
        name = getVal(3) || name;
      }

      // If no name or it's empty, skip row
      if (!name || name === "null" || name === "undefined") return;

      // Clean consumer number
      if (!consumerNo || consumerNo === "null") {
        consumerNo = `CUST-${rowIdx}`;
      }

      // Deduplicate within the same uploaded file
      if (seenCodes.has(consumerNo)) {
        return;
      }
      seenCodes.add(consumerNo);

      // Determine customer type
      const isCommercial =
        rawType.includes("COMM") ||
        rawType.includes("HOTEL") ||
        rawType.includes("REST") ||
        rawType.includes("INDUSTR") ||
        rawType.includes("NON-DOM") ||
        rawType.includes("COMMERCIAL");

      const type: "DOMESTIC" | "COMMERCIAL" = isCommercial ? "COMMERCIAL" : "DOMESTIC";

      // Detect GST in address or notes if not provided in column
      if (!gst && address) {
        const gstMatch = address.match(/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i);
        if (gstMatch) {
          gst = gstMatch[0].toUpperCase();
        }
      }

      // Phone handling: Schema requires phone to be a string. Default to consumerNo if absent
      const validPhone = phone && phone.length >= 5 ? phone : consumerNo;

      customersToProcess.push({
        name,
        phone: validPhone,
        address: address || null,
        areaRoute: areaRoute || null,
        type,
        customerCode: consumerNo,
        email: email || null,
        gstNumber: gst || null,
        businessType: businessType || (isCommercial ? "Commercial" : null),
        contactPerson: contactPerson || null,
        agencyId: session.agencyId!,
        isActive: true,
        isDeleted: false,
      });
    });

    if (customersToProcess.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid customer records could be extracted from the file. Please check that your Excel file has customer rows.",
        },
        { status: 400 }
      );
    }

    // ── Upsert Existing Records & Insert New Records in Batches ─────────────────
    // 1. Fetch all existing customer codes in this agency to identify what needs update vs insert
    const existingCustomers = await prisma.customer.findMany({
      where: {
        agencyId: session.agencyId,
      },
      select: {
        id: true,
        customerCode: true,
      },
    });

    const existingCodeMap = new Map<string, string>();
    existingCustomers.forEach((c) => {
      if (c.customerCode) {
        existingCodeMap.set(c.customerCode, c.id);
      }
    });

    const toInsert: typeof customersToProcess = [];
    const toUpdate: Array<{ id: string; data: (typeof customersToProcess)[0] }> = [];

    customersToProcess.forEach((c) => {
      const existingId = existingCodeMap.get(c.customerCode);
      if (existingId) {
        toUpdate.push({ id: existingId, data: c });
      } else {
        toInsert.push(c);
      }
    });

    // 2. Perform Batch Inserts (1,000 at a time for maximum throughput)
    const BATCH_SIZE = 1000;
    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const chunk = toInsert.slice(i, i + BATCH_SIZE);
      const res = await prisma.customer.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      insertedCount += res.count;
    }

    // 3. Perform Batch Updates for existing matching records (fixes previously bad/mismapped imports)
    let updatedCount = 0;
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
              gstNumber: item.data.gstNumber,
              businessType: item.data.businessType,
              contactPerson: item.data.contactPerson,
              isActive: true,
              isDeleted: false,
              deletedAt: null,
            },
          })
        )
      );
      updatedCount += chunk.length;
    }

    revalidatePath("/admin/customer-management");
    revalidatePath("/staff/customer-management");
    revalidatePath("/manager/customer-management");

    return NextResponse.json({
      success: true,
      totalRows: customersToProcess.length,
      insertedCount,
      updatedCount,
      sample: customersToProcess.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error("[bulk-import-customers] error:", error);
    const message = error instanceof Error ? error.message : "Failed to parse and import file.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
