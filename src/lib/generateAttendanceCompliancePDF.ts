/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export interface CompliancePDFData {
  agencyName: string;
  month: number;
  year: number;
  records: {
    employeeName: string;
    role: string;
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    rate: number;
  }[];
}

export async function generateAttendanceCompliancePDF(data: CompliancePDFData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW  = 210;
  const PH  = 297;
  const ML  = 14;
  const MR  = 14;
  const CW  = PW - ML - MR;   // 182mm
  const TR  = ML + CW;        // right edge = 196

  const rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1,3),16),
    parseInt(hex.slice(3,5),16),
    parseInt(hex.slice(5,7),16),
  ];

  const fill = (x:number,y:number,w:number,h:number,hex:string) => {
    doc.setFillColor(...rgb(hex));
    doc.rect(x,y,w,h,"F");
  };

  const fillR = (x:number,y:number,w:number,h:number,hex:string,r=2) => {
    doc.setFillColor(...rgb(hex));
    doc.roundedRect(x,y,w,h,r,r,"F");
  };

  const strokeRect = (x:number,y:number,w:number,h:number,hex="#D1D5DB",lw=0.3) => {
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(hex));
    doc.rect(x,y,w,h,"S");
  };

  const strokeRoundRect = (x:number,y:number,w:number,h:number,hex="#D1D5DB",lw=0.3,r=2) => {
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(hex));
    doc.roundedRect(x,y,w,h,r,r,"S");
  };

  const hline = (x1:number,yy:number,x2:number,hex="#D1D5DB",lw=0.25) => {
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(hex));
    doc.line(x1,yy,x2,yy);
  };

  const vline = (xx:number,y1:number,y2:number,hex="#D1D5DB",lw=0.25) => {
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(hex));
    doc.line(xx,y1,xx,y2);
  };

  type TxtOpts = {
    align?: "left"|"center"|"right";
    style?: "normal"|"bold"|"italic";
    size?: number;
    hex?: string;
  };

  const t = (str:string, x:number, yy:number, o:TxtOpts={}) => {
    doc.setFont("helvetica", o.style??"normal");
    doc.setFontSize(o.size??9);
    doc.setTextColor(...rgb(o.hex??"#111827"));
    doc.text(str, x, yy, { align: o.align??"left" });
  };

  let y = 0;

  // Background page fill
  fill(0, 0, PW, PH, "#FFFFFF");

  // Title & Header info
  t(data.agencyName || "Gas Agency", ML, 15, { style:"bold", size:14, hex:"#111827" });
  t(`Generated: ${new Date().toLocaleDateString("en-IN")}`, ML, 21, { size:8, hex:"#6B7280" });
  t("Monthly Attendance Compliance Report", TR, 14, { align:"right", style:"bold", size:11, hex:"#111827" });
  t(`${MONTHS[data.month - 1]} ${data.year}`, TR, 20, { align:"right", size:10, hex:"#2563EB", style:"bold" });

  y = 26;
  hline(ML, y, TR, "#E5E7EB", 0.4);
  y += 6;

  // KPI Summary box
  const totalEmployees = data.records.length;
  const avgAttendanceRate = Math.round(data.records.reduce((s, r) => s + r.rate, 0) / (totalEmployees || 1));

  fillR(ML, y, CW, 18, "#F9FAFB", 2);
  strokeRoundRect(ML, y, CW, 18, "#E5E7EB", 0.3, 2);

  t("Total Employees", ML + 8, y + 6, { size:7.5, hex:"#6B7280" });
  t(String(totalEmployees), ML + 8, y + 13, { style:"bold", size:13, hex:"#111827" });

  t("Average Monthly Attendance Rate", ML + 60, y + 6, { size:7.5, hex:"#6B7280" });
  t(`${avgAttendanceRate}%`, ML + 60, y + 13, { style:"bold", size:13, hex:"#2563EB" });

  const topAbsentees = [...data.records]
    .filter((r) => r.absent > 0)
    .sort((a, b) => b.absent - a.absent)
    .slice(0, 2)
    .map((r) => r.employeeName)
    .join(", ") || "None";

  t("Top Absentees (Days)", ML + 125, y + 6, { size:7.5, hex:"#6B7280" });
  t(topAbsentees, ML + 125, y + 13, { style:"bold", size:9.5, hex:"#B91C1C" });

  y += 24;

  // Table header
  const tableTop = y;
  const rowH = 8;
  const headers = ["Employee", "Role", "Present", "Absent", "Half Day", "Leave", "Rate"];
  const colWidths = [45, 30, 20, 20, 20, 20, 27]; // Sum: 182mm

  // Header background
  fill(ML, y, CW, rowH, "#F3F4F6");
  strokeRect(ML, y, CW, rowH, "#D1D5DB", 0.35);

  let currentX = ML;
  headers.forEach((h, idx) => {
    const isNum = idx >= 2;
    t(
      h, 
      currentX + (isNum ? colWidths[idx] - 3 : 3), 
      y + 5.5, 
      { style:"bold", size:8, hex:"#111827", align: isNum ? "right" : "left" }
    );
    currentX += colWidths[idx];
  });

  y += rowH;

  // Table Body Rows
  data.records.forEach((record, rIdx) => {
    // Alternating rows
    if (rIdx % 2 === 1) {
      fill(ML, y, CW, rowH, "#F9FAFB");
    }
    strokeRect(ML, y, CW, rowH, "#E5E7EB", 0.25);

    let rowX = ML;
    const rowValues = [
      record.employeeName,
      record.role.replace(/_/g, " "),
      String(record.present),
      String(record.absent),
      String(record.halfDay),
      String(record.leave),
      `${record.rate}%`
    ];

    rowValues.forEach((val, idx) => {
      const isNum = idx >= 2;
      const isRate = idx === 6;
      let fontHex = "#111827";
      let isBold = false;
      if (idx === 3 && record.absent > 0) fontHex = "#DC2626"; // highlight absent in red
      if (isRate) {
        fontHex = record.rate >= 90 ? "#16A34A" : record.rate >= 75 ? "#D97706" : "#DC2626";
        isBold = true;
      }
      t(
        val,
        rowX + (isNum ? colWidths[idx] - 3 : 3),
        y + 5.5,
        { size:8, hex: fontHex, align: isNum ? "right" : "left", style: isBold ? "bold" : "normal" }
      );
      rowX += colWidths[idx];
    });

    y += rowH;
  });

  // Footer / Compliance statement
  const footerY = PH - 20;
  hline(ML, footerY - 3, TR, "#E5E7EB", 0.25);
  
  t("Prepared By: System Administrator", ML, footerY + 2, { size:7.5, hex:"#4B5563" });
  t("Authorized Signature: _______________________", TR, footerY + 2, { size:7.5, hex:"#4B5563", align:"right" });
  t("This compliance document aggregates automated digital check-in records.", PW / 2, footerY + 8, { size:7, hex:"#9CA3AF", align:"center" });

  const safeName = `${MONTHS[data.month - 1]}_${data.year}_Attendance_Report`.replace(/\s+/g, "_");
  doc.save(`${safeName}.pdf`);
}
