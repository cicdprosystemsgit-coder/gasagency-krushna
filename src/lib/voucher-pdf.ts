import { jsPDF } from "jspdf";

export function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const helper = (n: number): string => {
    if (n === 0) return "";
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str.trim();
  };

  if (num === 0) return "Zero";
  const parts = [];

  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crores > 0) parts.push(helper(crores) + " Crore");
  if (lakhs > 0) parts.push(helper(lakhs) + " Lakh");
  if (thousands > 0) parts.push(helper(thousands) + " Thousand");
  if (remaining > 0) parts.push(helper(remaining));

  return parts.join(" ") + " Rupees Only";
}

interface VoucherData {
  voucherNo: string;
  date: string;
  type: "INFLOW" | "OUTFLOW";
  amount: number;
  description: string;
  partyName: string;
  paymentMode: string;
  referenceNo: string;
  accountName: string;
  agencyName: string;
}

export function generateVoucherPDF(data: VoucherData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5" // Standard compact voucher size
  });

  // Borders
  doc.setDrawColor(99, 102, 241); // indigo-500
  doc.setLineWidth(1);
  doc.rect(5, 5, 138, 200); // A5 size is 148 x 210

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.rect(7, 7, 134, 196);

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(data.agencyName.toUpperCase(), 74, 18, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("LPG DISTRIBUTOR & ENERGY SOLUTIONS", 74, 23, { align: "center" });

  // Voucher Type Title Banner
  const isOut = data.type === "OUTFLOW";
  const bannerColor = isOut ? [239, 68, 68] : [16, 185, 129]; // Red vs Green
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.rect(10, 28, 128, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(isOut ? "PAYMENT VOUCHER" : "RECEIPT VOUCHER", 74, 33, { align: "center" });

  // Metadata block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  doc.text(`Voucher No: ${data.voucherNo}`, 12, 44);
  doc.text(`Date: ${data.date}`, 100, 44);

  // Divider line
  doc.setDrawColor(203, 213, 225);
  doc.line(10, 48, 138, 48);

  // Content Labels & Values
  const yStart = 55;
  const lineSpacing = 8.5;

  const fields = [
    { label: isOut ? "Paid To:" : "Received From:", value: data.partyName || "N/A" },
    { label: "Account Title:", value: data.accountName },
    { label: "Payment Mode:", value: data.paymentMode || "UPI" },
    { label: "Reference/Cheque No:", value: data.referenceNo || "N/A" },
    { label: "Amount (INR):", value: `INR ${data.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, isBoldVal: true },
    { label: "Amount in Words:", value: numberToWords(data.amount) },
    { label: "Narration:", value: data.description }
  ];

  doc.setFontSize(8.5);
  fields.forEach((field, idx) => {
    const y = yStart + idx * lineSpacing;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(field.label, 12, y);

    doc.setFont("helvetica", field.isBoldVal ? "bold" : "normal");
    doc.setTextColor(15, 23, 42);
    
    // Auto-wrap long narration or words
    if (field.label === "Amount in Words:" || field.label === "Narration:") {
      const splitText = doc.splitTextToSize(field.value, 85);
      doc.text(splitText, 45, y);
    } else {
      doc.text(field.value, 45, y);
    }
  });

  // Divider
  doc.line(10, yStart + fields.length * lineSpacing + 4, 138, yStart + fields.length * lineSpacing + 4);

  // Signatures
  const sigY = 182;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  // Prepared By
  doc.line(12, sigY, 40, sigY);
  doc.text("Prepared By", 26, sigY + 4, { align: "center" });

  // Receiver Signature
  doc.line(48, sigY, 74, sigY);
  doc.text("Receiver's Signature", 61, sigY + 4, { align: "center" });

  // Manager / Checked By
  doc.line(82, sigY, 106, sigY);
  doc.text("Checked By", 94, sigY + 4, { align: "center" });

  // Approved By
  doc.line(114, sigY, 136, sigY);
  doc.text("Authorized Sign", 125, sigY + 4, { align: "center" });

  // Save PDF
  doc.save(`Voucher_${data.voucherNo}.pdf`);
}
