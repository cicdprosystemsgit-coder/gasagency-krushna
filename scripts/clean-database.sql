-- =============================================================================
-- Gasagency — Clean Database SQL Script (VPS / Production Safe)
-- Preserves: Users/Employees, Agencies, Customers, Products, Vehicles, Salaries
-- Wipes: All operational transactions, stock movements, closings, sales, expenses
-- =============================================================================

BEGIN;

-- 1. Logs & Files
DELETE FROM "DeliveryPhotoBackup";
DELETE FROM "Document";
DELETE FROM "MessageLog";
DELETE FROM "JobLog";

-- 2. Security, Tokens & Audits
DELETE FROM "SecurityChangeRequest";
DELETE FROM "Notification";
DELETE FROM "AuditLog";
DELETE FROM "RenewalReminder";
DELETE FROM "DemoRequest";
DELETE FROM "TokenBlacklist";
DELETE FROM "RefreshToken";

-- 3. Personal Finance & Accounts
DELETE FROM "UdhaariRecovery";
DELETE FROM "UdhaariReminder";
DELETE FROM "PersonalUdhaari";
DELETE FROM "PersonalTransaction";
DELETE FROM "ChequeRegister";
DELETE FROM "OilCompanyLedger";
DELETE FROM "DailyCashReconciliation";
DELETE FROM "EmiPayment";
DELETE FROM "FdLoanRecord";
DELETE FROM "VendorLedgerEntry";
DELETE FROM "VendorLedger";
DELETE FROM "CompanyPayment";
DELETE FROM "CashfreeTransaction";

-- Reset Personal Account balances to 0
UPDATE "PersonalAccount" SET "openingBalance" = 0, "currentBalance" = 0;

-- 4. Employee & HR Records (Keep logins & profiles, wipe transactional history)
DELETE FROM "AttendanceRegularization";
DELETE FROM "Attendance";
DELETE FROM "LeaveRequest";
DELETE FROM "EmployeeExpense";
DELETE FROM "SalaryPaymentRequest";
DELETE FROM "SalaryDrawing";
DELETE FROM "SalaryAdvance";
DELETE FROM "SalaryBonus";

-- Reset user lockouts and failed attempts so all staff can log in
UPDATE "User" SET "failedLoginAttempts" = 0, "lockedUntil" = NULL, "isActive" = true;

-- 5. Sales, Deliveries, Invoices & Closings
DELETE FROM "CustomerComplaint";
DELETE FROM "DeliveryTarget";
DELETE FROM "PaymentReceipt";
DELETE FROM "GstInvoice";
DELETE FROM "CreditLedgerEntry";
DELETE FROM "RegulatorRecord";
DELETE FROM "OfficeTransaction";
DELETE FROM "CommercialSale";
DELETE FROM "DeliveryCountRequest";
DELETE FROM "DeliveryRecord";
DELETE FROM "VehicleTripLog";
DELETE FROM "DailyClosingEmployee";
DELETE FROM "DailyClosing";
DELETE FROM "DailySummary";
DELETE FROM "SectionSummary";
DELETE FROM "Expense";

-- 6. Godown & Stock Registers
DELETE FROM "GodownRecord";
DELETE FROM "GodownInventory";
DELETE FROM "StockRecord";
DELETE FROM "DailyStockRegister";

-- 7. Remove soft-deleted products (keep all active products)
DELETE FROM "Product" WHERE "isDeleted" = true;

COMMIT;

