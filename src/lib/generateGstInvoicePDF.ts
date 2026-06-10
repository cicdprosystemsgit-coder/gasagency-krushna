/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export interface GstInvoicePDFData {
  invoiceNo: string;
  invoiceDate: string;           // DD/MM/YYYY
  agencyName: string;
  agencyAddress: string;
  agencyCity: string;
  agencyState: string;
  agencyPhone: string;
  agencyGstin: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    productName: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  cgst: number;                 // 2.5 % of subtotal
  sgst: number;                 // 2.5 % of subtotal
  totalTax: number;
  grandTotal: number;
}

// jsPDF Helvetica does NOT render ₹ — use "Rs." prefix
function amt(n: number): string {
  return "Rs." + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Indian number-to-words ────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoD  = (x: number): string =>
    x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
  const threeD = (x: number): string =>
    x < 100 ? twoD(x) : ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " " + twoD(x % 100) : "");
  let result = "";
  if (n >= 10000000) { result += threeD(Math.floor(n / 10000000)) + " Crore "; n %= 10000000; }
  if (n >= 100000)   { result += twoD(Math.floor(n / 100000)) + " Lakh ";    n %= 100000; }
  if (n >= 1000)     { result += twoD(Math.floor(n / 1000)) + " Thousand ";  n %= 1000; }
  if (n > 0)         { result += threeD(n); }
  return result.trim();
}

const rgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export async function generateGstInvoicePDF(data: GstInvoicePDFData): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const PW = 210;
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR;   // 182 mm
  const TR = ML + CW;         // right edge 196

  // ── Helper functions ────────────────────────────────────────────────────────
  const fill = (x: number, y: number, w: number, h: number, hex: string) => {
    doc.setFillColor(...rgb(hex));
    doc.rect(x, y, w, h, "F");
  };

  const hline = (x1: number, yy: number, x2: number, hex = "#D1D5DB", lw = 0.3) => {
    doc.setLineWidth(lw);
    doc.setDrawColor(...rgb(hex));
    doc.line(x1, yy, x2, yy);
  };

  type TxtOpts = {
    align?: "left" | "center" | "right";
    style?: "normal" | "bold" | "italic";
    size?: number;
    hex?: string;
  };
  const t = (str: string, x: number, yy: number, o: TxtOpts = {}) => {
    doc.setFont("helvetica", o.style ?? "normal");
    doc.setFontSize(o.size ?? 9);
    doc.setTextColor(...rgb(o.hex ?? "#111827"));
    doc.text(str, x, yy, { align: o.align ?? "left" });
  };

  let y = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // 1. HEADER BAND
  // ══════════════════════════════════════════════════════════════════════════
  fill(0, 0, PW, 40, "#1D4ED8");        // blue band

  // Agency name
  t(data.agencyName || "Gas Agency", ML, 12, { style: "bold", size: 14, hex: "#FFFFFF" });

  // Agency address
  const addrLine = [data.agencyAddress, data.agencyCity, data.agencyState].filter(Boolean).join(", ");
  if (addrLine) t(addrLine, ML, 18, { size: 8, hex: "#BFDBFE" });
  if (data.agencyPhone) t(`Ph: ${data.agencyPhone}`, ML, 23, { size: 8, hex: "#BFDBFE" });
  if (data.agencyGstin) t(`GSTIN: ${data.agencyGstin}`, ML, 28, { size: 8, hex: "#BFDBFE" });

  // Right side: TAX INVOICE label
  t("TAX INVOICE", TR, 12, { align: "right", style: "bold", size: 16, hex: "#FFFFFF" });

  // Invoice no and date on right
  t(data.invoiceNo, TR, 20, { align: "right", style: "bold", size: 10, hex: "#BFDBFE" });
  t(`Date: ${data.invoiceDate}`, TR, 26, { align: "right", size: 8.5, hex: "#BFDBFE" });

  y = 47;

  // ══════════════════════════════════════════════════════════════════════════
  // 2. BILL TO SECTION
  // ══════════════════════════════════════════════════════════════════════════
  fill(ML, y, CW, 28, "#F8FAFC");
  doc.setLineWidth(0.35);
  doc.setDrawColor(...rgb("#E2E8F0"));
  doc.rect(ML, y, CW, 28, "S");

  // Left accent bar
  fill(ML, y, 3, 28, "#1D4ED8");

  t("BILL TO", ML + 6, y + 6, { style: "bold", size: 7.5, hex: "#6B7280" });
  t(data.customerName, ML + 6, y + 12.5, { style: "bold", size: 11, hex: "#111827" });

  const billLine2Parts = [];
  if (data.customerAddress) billLine2Parts.push(data.customerAddress);
  if (billLine2Parts.length) t(billLine2Parts.join(", "), ML + 6, y + 18.5, { size: 8, hex: "#52525B" });
  if (data.customerPhone) t(`Phone: ${data.customerPhone}`, ML + 6, y + 24, { size: 8, hex: "#52525B" });

  y += 34;

  // ══════════════════════════════════════════════════════════════════════════
  // 3. ITEMS TABLE (using autoTable)
  // ══════════════════════════════════════════════════════════════════════════
  const tableRows = data.items.map((item, i) => [
    String(i + 1),
    item.productName,
    String(item.qty),
    amt(item.rate),
    amt(item.amount),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [["#", "Description / Product", "Qty", "Unit Rate", "Amount"]],
    body: tableRows,
    headStyles: {
      fillColor: rgb("#1D4ED8") as any,
      textColor: rgb("#FFFFFF") as any,
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left",   cellWidth: "auto" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right",  cellWidth: 36 },
      4: { halign: "right",  cellWidth: 36 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: rgb("#374151") as any,
    },
    alternateRowStyles: { fillColor: rgb("#F8FAFC") as any },
    styles: { cellPadding: 3.5, lineColor: rgb("#E2E8F0") as any, lineWidth: 0.2 },
    tableLineColor: rgb("#CBD5E1") as any,
    tableLineWidth: 0.3,
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TAX SUMMARY (right-aligned box)
  // ══════════════════════════════════════════════════════════════════════════
  const summaryW = 88;
  const summaryX = TR - summaryW;
  const ROW_H    = 8.5;
  const summaryRows = [
    ["Taxable Value (Subtotal)",  amt(data.subtotal)],
    [`CGST @ 2.5%`,               amt(data.cgst)],
    [`SGST @ 2.5%`,               amt(data.sgst)],
  ];
  const summaryH = summaryRows.length * ROW_H + ROW_H + 2; // rows + grand total row

  fill(summaryX, y, summaryW, summaryH, "#F8FAFC");
  doc.setLineWidth(0.3);
  doc.setDrawColor(...rgb("#E2E8F0"));
  doc.rect(summaryX, y, summaryW, summaryH, "S");

  let sy = y + ROW_H - 2;
  summaryRows.forEach(([label, value]) => {
    t(label, summaryX + 4, sy, { size: 8.5, hex: "#52525B" });
    t(value, TR - 4,        sy, { size: 8.5, hex: "#374151", align: "right", style: "bold" });
    sy += ROW_H;
    hline(summaryX, sy - 1, TR, "#E2E8F0", 0.2);
  });

  // Grand total row
  fill(summaryX, sy - 1.5, summaryW, ROW_H + 1.5, "#1D4ED8");
  t("GRAND TOTAL", summaryX + 4, sy + 5.5, { size: 9, hex: "#FFFFFF", style: "bold" });
  t(amt(data.grandTotal), TR - 4, sy + 5.5, { size: 9, hex: "#FFFFFF", style: "bold", align: "right" });

  y += summaryH + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // 5. AMOUNT IN WORDS
  // ══════════════════════════════════════════════════════════════════════════
  hline(ML, y, TR, "#E2E8F0", 0.25);
  y += 5;
  const words = numberToWords(Math.round(data.grandTotal));
  t("Amount in Words:", ML, y, { style: "bold", size: 8.5, hex: "#374151" });
  t(`Indian Rupee ${words} Only`, ML + 34, y, { size: 8.5, hex: "#111827" });
  y += 8;

  // ══════════════════════════════════════════════════════════════════════════
  // 6. TERMS & DECLARATION
  // ══════════════════════════════════════════════════════════════════════════
  hline(ML, y, TR, "#E2E8F0", 0.25);
  y += 5;

  t("Terms & Conditions:", ML, y, { style: "bold", size: 8, hex: "#374151" });
  y += 5;
  const terms = [
    "1. Goods once sold will not be taken back.",
    "2. Interest @ 24% p.a. will be charged on overdue payments.",
    "3. Subject to local jurisdiction only.",
    "4. This is a computer-generated invoice and does not require a physical signature.",
  ];
  terms.forEach((term) => {
    t(term, ML + 2, y, { size: 7.5, hex: "#6B7280" });
    y += 4.5;
  });
  y += 2;

  // ══════════════════════════════════════════════════════════════════════════
  // 7. SIGNATURE SECTION
  // ══════════════════════════════════════════════════════════════════════════
  const sigY = y;
  // Left: Receiver
  doc.setLineWidth(0.25);
  doc.setDrawColor(...rgb("#D1D5DB"));
  doc.line(ML, sigY + 18, ML + 60, sigY + 18);
  t("Receiver's Signature & Date", ML, sigY + 23, { size: 7.5, hex: "#6B7280" });

  // Right: Authorized Signatory
  doc.line(TR - 60, sigY + 18, TR, sigY + 18);
  t("Authorized Signatory", TR - 60, sigY + 23, { size: 7.5, hex: "#6B7280" });
  t(data.agencyName || "Gas Agency", TR, sigY + 23, { size: 7.5, hex: "#374151", align: "right" });

  y += 30;

  // ══════════════════════════════════════════════════════════════════════════
  // 8. FOOTER BAND
  // ══════════════════════════════════════════════════════════════════════════
  const footerY = 284;
  fill(0, footerY, PW, 13, "#1D4ED8");
  t("Thank you for your business!", PW / 2, footerY + 5, {
    align: "center", size: 8.5, hex: "#BFDBFE", style: "bold",
  });
  t(
    data.agencyGstin ? `GSTIN: ${data.agencyGstin}  |  ${data.agencyPhone}` : data.agencyPhone,
    PW / 2, footerY + 10,
    { align: "center", size: 7.5, hex: "#93C5FD" }
  );

  // ── Save ──────────────────────────────────────────────────────────────────
  doc.save(`GST_Invoice_${data.invoiceNo}.pdf`);
}
