import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Customers Sample");

  ws.columns = [
    { header: "Sr No", key: "sr", width: 10 },
    { header: "Consumer Number", key: "consumerNo", width: 20 },
    { header: "Customer Name", key: "name", width: 30 },
    { header: "Address", key: "address", width: 45 },
    { header: "Area / Route", key: "area", width: 25 },
    { header: "Customer Type", key: "type", width: 18 },
    { header: "Mobile Number", key: "phone", width: 18 },
  ];

  // Header styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2563EB" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Sample data rows matching the user's data structure
  const samples = [
    {
      sr: 1,
      consumerNo: "123998307",
      name: "Mr. DIPAK KAILAS PATIL",
      address: "SHIRPUR P NO 8 VENKATESH NAGAR MANDAL S DHULE Maharashtra",
      area: "2-Rajsagar Ekyc Pending",
      type: "Domestic",
      phone: "9876543210",
    },
    {
      sr: 2,
      consumerNo: "124003122",
      name: "PRASAD AMRUTULLYA TEA AND SNAK",
      address: "CHAHARDI ZANDA CHOUK TAL CHOPDA DIST JALGOAN",
      area: "72-ABG 22",
      type: "Commercial",
      phone: "9823456789",
    },
    {
      sr: 3,
      consumerNo: "124005077",
      name: "Mr. TUSHAR SHANKARSINGH HAJARI",
      address: "SHIRPUR 24 MAHARAJA AGRAS 80 FOOTI ROAD 0 DHULE Maharashtra",
      area: "41-Shirpur Harshal",
      type: "Domestic",
      phone: "9123456780",
    },
  ];

  samples.forEach((sample) => {
    ws.addRow(sample);
  });

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="customer_import_sample_template.xlsx"',
    },
  });
}
