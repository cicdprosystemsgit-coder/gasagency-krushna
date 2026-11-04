import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 1. Load environment variables before initializing Prisma
const envFiles = [".env.production", ".env.local", ".env"];
let loadedEnv = false;
for (const file of envFiles) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`Loaded environment from: ${file}`);
    loadedEnv = true;
  }
}

if (!loadedEnv && !process.env.DATABASE_URL) {
  console.warn("⚠️ Warning: No .env, .env.production, or .env.local found in current directory.");
}

let prismaInstance: any = null;

async function main() {
  console.log("=== STARTING DATABASE CLEANUP ===");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is missing. Please check your .env or .env.production file.");
    process.exit(1);
  }

  // Dynamic import so Prisma initializes with loaded DATABASE_URL
  const { prisma } = await import("../src/lib/prisma");
  prismaInstance = prisma;

  // 1. Verify what we are preserving
  const preserved = {
    agencies: await prisma.agency.count(),
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    deliveryVehicles: await prisma.deliveryVehicle.count(),
    vehicleAgencyAssets: await prisma.vehicleAgencyAsset.count(),
    customRoles: await prisma.customRole.count(),
    rolePermissions: await prisma.rolePermission.count(),
    branches: await prisma.branch.count(),
    expenseCategories: await prisma.expenseCategory.count(),
    workShifts: await prisma.workShift.count(),
    employeeSalaryProfiles: await prisma.employeeSalaryProfile.count(),
    personalAccounts: await prisma.personalAccount.count(),
  };

  console.log("\nPreserved Master Configuration / Profiles before clean:", preserved);

  // 2. Backup operational data before deletion
  const backupDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-before-clean-${timestamp}.json`);
  console.log(`\nExporting backup snapshot to: ${backupFile}...`);

  const snapshot: Record<string, unknown> = {
    createdAt: new Date().toISOString(),
    dailyClosings: await prisma.dailyClosing.findMany(),
    dailyClosingEmployees: await prisma.dailyClosingEmployee.findMany(),
    dailySummaries: await prisma.dailySummary.findMany(),
    sectionSummaries: await prisma.sectionSummary.findMany(),
    deliveryRecords: await prisma.deliveryRecord.findMany(),
    commercialSales: await prisma.commercialSale.findMany(),
    officeTransactions: await prisma.officeTransaction.findMany(),
    creditLedgerEntries: await prisma.creditLedgerEntry.findMany(),
    regulatorRecords: await prisma.regulatorRecord.findMany(),
    godownRecords: await prisma.godownRecord.findMany(),
    godownInventory: await prisma.godownInventory.findMany(),
    stockRecords: await prisma.stockRecord.findMany(),
    dailyStockRegisters: await prisma.dailyStockRegister.findMany(),
    vehicleTripLogs: await prisma.vehicleTripLog.findMany(),
    salaryDrawings: await prisma.salaryDrawing.findMany(),
    salaryAdvances: await prisma.salaryAdvance.findMany(),
    salaryBonuses: await prisma.salaryBonus.findMany(),
    salaryPaymentRequests: await prisma.salaryPaymentRequest.findMany(),
    expenses: await prisma.expense.findMany(),
    employeeExpenses: await prisma.employeeExpense.findMany(),
    gstInvoices: await prisma.gstInvoice.findMany(),
    paymentReceipts: await prisma.paymentReceipt.findMany(),
    customerComplaints: await prisma.customerComplaint.findMany(),
    deliveryTargets: await prisma.deliveryTarget.findMany(),
    deliveryCountRequests: await prisma.deliveryCountRequest.findMany(),
    securityChangeRequests: await prisma.securityChangeRequest.findMany(),
    attendances: await prisma.attendance.findMany(),
    attendanceRegularizations: await prisma.attendanceRegularization.findMany(),
    leaveRequests: await prisma.leaveRequest.findMany(),
    notifications: await prisma.notification.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
  };

  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), "utf8");
  console.log("Snapshot successfully written.");

  // 3. Wiping operational / transactional data in foreign-key safe order
  console.log("\nDeleting operational records...");

  // Backup & file logs
  await prisma.deliveryPhotoBackup.deleteMany();
  await prisma.document.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.jobLog.deleteMany();

  // Audit, Security & Notifications
  await prisma.securityChangeRequest.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.renewalReminder.deleteMany();
  await prisma.demoRequest.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.refreshToken.deleteMany();

  // Personal Finance & Accounts transactions
  await prisma.udhaariRecovery.deleteMany();
  await prisma.udhaariReminder.deleteMany();
  await prisma.personalUdhaari.deleteMany();
  await prisma.personalTransaction.deleteMany();
  await prisma.chequeRegister.deleteMany();
  await prisma.oilCompanyLedger.deleteMany();
  await prisma.dailyCashReconciliation.deleteMany();
  await prisma.emiPayment.deleteMany();
  await prisma.fdLoanRecord.deleteMany();
  await prisma.vendorLedgerEntry.deleteMany();
  await prisma.vendorLedger.deleteMany();
  await prisma.companyPayment.deleteMany();
  await prisma.cashfreeTransaction.deleteMany();

  // Reset Personal Accounts balances to 0
  await prisma.personalAccount.updateMany({
    data: {
      openingBalance: 0,
      currentBalance: 0,
    },
  });

  // HR & Employee transactions (keep profiles and users intact)
  await prisma.attendanceRegularization.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employeeExpense.deleteMany();
  await prisma.salaryPaymentRequest.deleteMany();
  await prisma.salaryDrawing.deleteMany();
  await prisma.salaryAdvance.deleteMany();
  await prisma.salaryBonus.deleteMany();

  // Reset user lockouts / failed attempts so employee logins are clean and active
  await prisma.user.updateMany({
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      isActive: true,
    },
  });

  // Sales, Customer Complaints, Deliveries & Closings
  await prisma.customerComplaint.deleteMany();
  await prisma.deliveryTarget.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.gstInvoice.deleteMany();
  await prisma.creditLedgerEntry.deleteMany();
  await prisma.regulatorRecord.deleteMany();
  await prisma.officeTransaction.deleteMany();
  await prisma.commercialSale.deleteMany();
  await prisma.deliveryCountRequest.deleteMany();
  await prisma.deliveryRecord.deleteMany();
  await prisma.vehicleTripLog.deleteMany();
  await prisma.dailyClosingEmployee.deleteMany();
  await prisma.dailyClosing.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.sectionSummary.deleteMany();
  await prisma.expense.deleteMany();

  // Godown & Stock records
  await prisma.godownRecord.deleteMany();
  await prisma.godownInventory.deleteMany();
  await prisma.stockRecord.deleteMany();
  await prisma.dailyStockRegister.deleteMany();

  // Remove soft-deleted products if any, keeping all active products
  await prisma.product.deleteMany({
    where: { isDeleted: true },
  });

  console.log("\n=== DELETION COMPLETE ===");

  // 4. Verify post-cleanup status
  console.log("\n--- VERIFYING PRESERVED DATA ---");
  const postPreserved = {
    agencies: await prisma.agency.count(),
    users: await prisma.user.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    deliveryVehicles: await prisma.deliveryVehicle.count(),
    employeeSalaryProfiles: await prisma.employeeSalaryProfile.count(),
  };
  console.table(postPreserved);

  console.log("\n--- VERIFYING WIPED DATA (ALL SHOULD BE 0) ---");
  const postWiped = {
    dailyClosing: await prisma.dailyClosing.count(),
    dailyClosingEmployee: await prisma.dailyClosingEmployee.count(),
    dailySummary: await prisma.dailySummary.count(),
    sectionSummary: await prisma.sectionSummary.count(),
    deliveryRecord: await prisma.deliveryRecord.count(),
    deliveryCountRequest: await prisma.deliveryCountRequest.count(),
    vehicleTripLog: await prisma.vehicleTripLog.count(),
    commercialSale: await prisma.commercialSale.count(),
    officeTransaction: await prisma.officeTransaction.count(),
    creditLedgerEntry: await prisma.creditLedgerEntry.count(),
    regulatorRecord: await prisma.regulatorRecord.count(),
    godownRecord: await prisma.godownRecord.count(),
    godownInventory: await prisma.godownInventory.count(),
    stockRecord: await prisma.stockRecord.count(),
    dailyStockRegister: await prisma.dailyStockRegister.count(),
    expense: await prisma.expense.count(),
    employeeExpense: await prisma.employeeExpense.count(),
    salaryDrawing: await prisma.salaryDrawing.count(),
    salaryAdvance: await prisma.salaryAdvance.count(),
    salaryBonus: await prisma.salaryBonus.count(),
    salaryPaymentRequest: await prisma.salaryPaymentRequest.count(),
    attendance: await prisma.attendance.count(),
    attendanceRegularization: await prisma.attendanceRegularization.count(),
    leaveRequest: await prisma.leaveRequest.count(),
    gstInvoice: await prisma.gstInvoice.count(),
    paymentReceipt: await prisma.paymentReceipt.count(),
    customerComplaint: await prisma.customerComplaint.count(),
    auditLog: await prisma.auditLog.count(),
    notification: await prisma.notification.count(),
    securityChangeRequest: await prisma.securityChangeRequest.count(),
    personalTransaction: await prisma.personalTransaction.count(),
    personalUdhaari: await prisma.personalUdhaari.count(),
    chequeRegister: await prisma.chequeRegister.count(),
    oilCompanyLedger: await prisma.oilCompanyLedger.count(),
    dailyCashReconciliation: await prisma.dailyCashReconciliation.count(),
  };
  console.table(postWiped);

  console.log("\nListing remaining User / Employee logins:");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  console.table(users);
}

main()
  .catch((err) => {
    console.error("❌ Cleanup failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
  });

