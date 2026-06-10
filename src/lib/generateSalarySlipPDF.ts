/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export interface SalarySlipData {
  agencyName: string;
  agencyAddress: string;
  agencyPhone: string;
  agencyGstin: string;
  employeeName: string;
  month: number;
  year: number;
  payDate: string;
  basicSalary: number;
  bonusAmount: number;
  advanceRecovery: number;
  remarks: string[];
}

// jsPDF Helvetica does NOT render ₹ — use "Rs." prefix
function amt(n: number): string {
  return "Rs." + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Days in month helper
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export async function generateSalarySlipPDF(data: SalarySlipData): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW  = 210;
  const PH  = 297;
  const ML  = 14;
  const MR  = 14;
  const CW  = PW - ML - MR;   // 182mm
  const TR  = ML + CW;        // right edge = 196

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER  (white background, company left / payslip label right)
  // ══════════════════════════════════════════════════════════════════════════
  fill(0, 0, PW, PH, "#FFFFFF"); // white page

  // Company name
  t(data.agencyName || "Gas Agency", ML, 14, { style:"bold", size:14, hex:"#111827" });

  // Address / city under company name
  const addrLine = [data.agencyAddress, data.agencyPhone].filter(Boolean).join(", ");
  if (addrLine) t(addrLine, ML, 20, { size:8, hex:"#6B7280" });

  // GSTIN
  if (data.agencyGstin) t(`GSTIN: ${data.agencyGstin}`, ML, 26, { size:7.5, hex:"#6B7280" });

  // Right: "Payslip For the Month" label
  t("Payslip For the Month", TR, 11, { align:"right", size:8, hex:"#6B7280" });
  t(`${MONTHS[data.month-1]} ${data.year}`, TR, 18, { align:"right", style:"bold", size:12, hex:"#111827" });

  y = 32;
  hline(ML, y, TR, "#E5E7EB", 0.4);
  y += 6;

  // ══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYEE SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  t("EMPLOYEE SUMMARY", ML, y, { style:"bold", size:8, hex:"#374151" });
  y += 5;

  // Left column: employee details
  const labelX  = ML;
  const colonX  = ML + 34;
  const valueX  = ML + 38;

  const rows: [string, string][] = [
    ["Employee Name", data.employeeName],
    ["Pay Period",    `${MONTHS[data.month-1]} ${data.year}`],
    ["Pay Date",      data.payDate],
  ];

  const rowH = 7;
  const detailStartY = y;

  rows.forEach(([label, val], i) => {
    const ry = y + i * rowH;
    t(label,  labelX, ry, { size:8.5, hex:"#374151" });
    t(":",    colonX, ry, { size:8.5, hex:"#374151" });
    t(val,    valueX, ry, { size:8.5, hex:"#111827", style:"bold" });
  });

  // Right column: Net Pay box
  const netBoxX = ML + 100;
  const netBoxW = CW - 100;
  const netBoxH = rows.length * rowH + 2;
  const totalNetPay = data.basicSalary + data.bonusAmount - data.advanceRecovery;

  // Green-tinted rounded box
  fillR(netBoxX, detailStartY - 2, netBoxW, netBoxH + 6, "#F0FDF4", 3);
  doc.setLineWidth(0.4);
  doc.setDrawColor(...rgb("#86EFAC"));
  doc.roundedRect(netBoxX, detailStartY - 2, netBoxW, netBoxH + 6, 3, 3, "S");

  // Left green accent bar
  fill(netBoxX, detailStartY - 2, 2.5, netBoxH + 6, "#22C55E");

  t(amt(totalNetPay), netBoxX + 5, detailStartY + 7, { style:"bold", size:14, hex:"#166534" });
  t("Employee Net Pay", netBoxX + 5, detailStartY + 13.5, { size:7.5, hex:"#4ADE80" });

  // Divider inside box
  hline(netBoxX + 4, detailStartY + 16, TR - 1, "#BBF7D0", 0.25);

  // Paid days
  const paid = daysInMonth(data.month, data.year);
  t("Paid Days", netBoxX + 5, detailStartY + 22, { size:7.5, hex:"#6B7280" });
  t(":", netBoxX + 28, detailStartY + 22, { size:7.5, hex:"#6B7280" });
  t(`${paid}`, netBoxX + 32, detailStartY + 22, { size:7.5, hex:"#111827", style:"bold" });

  y += rows.length * rowH + 6;
  hline(ML, y, TR, "#E5E7EB", 0.3);
  y += 6;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. EARNINGS / DEDUCTIONS TABLE
  // ══════════════════════════════════════════════════════════════════════════

  // Build earnings list
  const earnings: [string, number][] = [["Basic Salary", data.basicSalary]];
  if (data.bonusAmount > 0) earnings.push(["Bonus / Incentive", data.bonusAmount]);
  const grossEarnings = earnings.reduce((s, e) => s + e[1], 0);

  // Build deductions list (only advance recovery — skip EPF/PT as not applicable)
  const deductions: [string, number][] = [];
  if (data.advanceRecovery > 0) deductions.push(["Advance Recovery (Udhari)", data.advanceRecovery]);
  const totalDeductions = deductions.reduce((s, d) => s + d[1], 0);

  // Table columns:
  //   Earnings section: label from TL, amount right-aligned at midX-6
  //   Deductions section: label from midX+4, amount right-aligned at TR-4
  const midX = ML + CW / 2;

  const DATA_ROW_H = 9;
  const HDR_H      = 9;
  const GRS_ROW_H  = 9;

  const maxDataRows = Math.max(earnings.length, deductions.length);
  const tableH = HDR_H + maxDataRows * DATA_ROW_H + GRS_ROW_H;

  // Outer border
  strokeRoundRect(ML, y, CW, tableH, "#D1D5DB", 0.35, 2);

  // Header row background
  fill(ML, y, CW, HDR_H, "#F9FAFB");
  // Header texts
  t("EARNINGS",    ML + 4,   y + 6.2, { style:"bold", size:8,   hex:"#111827" });
  t("AMOUNT",      midX - 6, y + 6.2, { style:"bold", size:8,   hex:"#111827", align:"right" });
  t("DEDUCTIONS",  midX + 4, y + 6.2, { style:"bold", size:8,   hex:"#111827" });
  t("AMOUNT",      TR - 4,   y + 6.2, { style:"bold", size:8,   hex:"#111827", align:"right" });

  // Header bottom line
  hline(ML, y + HDR_H, TR, "#E5E7EB", 0.25);
  // Vertical divider full height
  vline(midX, y, y + tableH, "#E5E7EB", 0.25);

  y += HDR_H;

  // Data rows
  for (let i = 0; i < maxDataRows; i++) {
    const ry = y + i * DATA_ROW_H;
    const cy = ry + 6.2;

    if (earnings[i]) {
      t(earnings[i][0],       ML + 4,   cy, { size:8.5, hex:"#374151" });
      t(amt(earnings[i][1]),  midX - 6, cy, { size:8.5, hex:"#111827", style:"bold", align:"right" });
    }
    if (deductions[i]) {
      t(deductions[i][0],       midX + 4, cy, { size:8.5, hex:"#374151" });
      t(amt(deductions[i][1]),  TR - 4,   cy, { size:8.5, hex:"#111827", style:"bold", align:"right" });
    }

    hline(ML, ry + DATA_ROW_H, TR, "#F3F4F6", 0.2);
  }

  y += maxDataRows * DATA_ROW_H;

  // Gross Earnings / Total Deductions row
  fill(ML, y, CW, GRS_ROW_H, "#F3F4F6");
  hline(ML, y, TR, "#E5E7EB", 0.25);

  const gcy = y + 6.2;
  t("Gross Earnings",   ML + 4,   gcy, { style:"bold", size:8.5, hex:"#111827" });
  t(amt(grossEarnings), midX - 6, gcy, { style:"bold", size:8.5, hex:"#111827", align:"right" });

  if (deductions.length > 0) {
    t("Total Deductions",   midX + 4, gcy, { style:"bold", size:8.5, hex:"#111827" });
    t(amt(totalDeductions), TR - 4,   gcy, { style:"bold", size:8.5, hex:"#111827", align:"right" });
  }

  y += GRS_ROW_H + 6;

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TOTAL NET PAYABLE ROW
  // ══════════════════════════════════════════════════════════════════════════
  const TNP_H = 16;
  fillR(ML, y, CW, TNP_H, "#F9FAFB", 2);
  strokeRoundRect(ML, y, CW, TNP_H, "#D1D5DB", 0.35, 2);

  t("TOTAL NET PAYABLE",              ML + 5, y + 6,  { style:"bold", size:9, hex:"#111827" });
  t("Gross Earnings - Total Deductions", ML + 5, y + 12, { size:7.5, hex:"#6B7280" });
  t(amt(totalNetPay), TR - 5, y + 10, { style:"bold", size:12, hex:"#111827", align:"right" });

  y += TNP_H + 5;

  // Amount in words (right-aligned)
  const words = numberToWords(Math.round(totalNetPay));
  t(`Amount In Words : Indian Rupee ${words} Only`, TR, y, { size:8, hex:"#374151", align:"right" });
  y += 8;

  // ══════════════════════════════════════════════════════════════════════════
  // 5. REMARKS (if any)
  // ══════════════════════════════════════════════════════════════════════════
  if (data.remarks.length > 0) {
    hline(ML, y, TR, "#E5E7EB", 0.25);
    y += 5;
    t("Remarks:", ML, y, { style:"bold", size:8, hex:"#374151" });
    y += 5;
    data.remarks.forEach((r) => {
      t(`- ${r}`, ML + 3, y, { size:8, hex:"#6B7280" });
      y += 5;
    });
    y += 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // 6. FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  // Pin to bottom of page
  const footerY = PH - 14;
  hline(ML, footerY - 3, TR, "#E5E7EB", 0.25);
  t(
    "-- This document has been automatically generated; therefore, a signature is not required. --",
    PW / 2, footerY + 2, { align:"center", size:7, hex:"#9CA3AF" }
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  const safeName = data.employeeName.replace(/\s+/g, "_");
  doc.save(`Salary_Slip_${safeName}_${MONTHS[data.month-1]}_${data.year}.pdf`);
}

// ── Indian number-to-words ────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen",
    "Seventeen","Eighteen","Nineteen",
  ];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

  const twoD  = (x: number): string =>
    x < 20 ? ones[x] : tens[Math.floor(x/10)] + (x%10 ? " "+ones[x%10] : "");
  const threeD = (x: number): string =>
    x < 100 ? twoD(x) : ones[Math.floor(x/100)]+" Hundred"+(x%100 ? " "+twoD(x%100) : "");

  let result = "";
  if (n >= 10000000){ result += threeD(Math.floor(n/10000000))+" Crore "; n%=10000000; }
  if (n >= 100000)  { result += twoD(Math.floor(n/100000))+" Lakh ";    n%=100000; }
  if (n >= 1000)    { result += twoD(Math.floor(n/1000))+" Thousand ";  n%=1000; }
  if (n > 0)        { result += threeD(n); }
  return result.trim();
}
