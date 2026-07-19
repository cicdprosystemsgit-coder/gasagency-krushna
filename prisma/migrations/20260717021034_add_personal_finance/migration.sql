/*
  Warnings:

  - The `paymentMode` column on the `OfficeTransaction` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PersonalAccountType" AS ENUM ('SAVINGS', 'CURRENT', 'CASH', 'WALLET', 'FD', 'LOAN');

-- CreateEnum
CREATE TYPE "PersonalTxnType" AS ENUM ('INCOME', 'EXPENSE', 'PAID_TO', 'RECEIVED_FROM', 'UDHAARI_GIVEN', 'UDHAARI_RECEIVED', 'TRANSFER_OUT', 'TRANSFER_IN', 'AGENCY_DEPOSIT', 'AGENCY_WITHDRAWAL');

-- CreateEnum
CREATE TYPE "UdhaariStatus" AS ENUM ('OUTSTANDING', 'PARTIAL', 'SETTLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('PENDING', 'PRESENTED', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FdLoanType" AS ENUM ('FIXED_DEPOSIT', 'RECURRING_DEPOSIT', 'PERSONAL_LOAN', 'BUSINESS_LOAN', 'VEHICLE_LOAN', 'HOME_LOAN', 'CC_LIMIT');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CASHIER';

-- AlterEnum
ALTER TYPE "SalaryRequestStatus" ADD VALUE 'MANAGER_APPROVED';

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "themeColor" TEXT NOT NULL DEFAULT '#2563eb';

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "punchInLat" DOUBLE PRECISION,
ADD COLUMN     "punchInLng" DOUBLE PRECISION,
ADD COLUMN     "punchOutLat" DOUBLE PRECISION,
ADD COLUMN     "punchOutLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "CommercialSale" ADD COLUMN     "deliveredById" TEXT;

-- AlterTable
ALTER TABLE "DeliveryRecord" ADD COLUMN     "creditAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryAccuracy" DOUBLE PRECISION,
ADD COLUMN     "deliveryLat" DOUBLE PRECISION,
ADD COLUMN     "deliveryLng" DOUBLE PRECISION,
ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "driveFileId" TEXT,
ADD COLUMN     "driveViewUrl" TEXT,
ADD COLUMN     "storageType" TEXT NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "fileBase64" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GodownInventory" ADD COLUMN     "invoiceDate" TIMESTAMP(3),
ADD COLUMN     "invoiceNo" TEXT,
ADD COLUMN     "recordAccuracy" DOUBLE PRECISION,
ADD COLUMN     "recordLat" DOUBLE PRECISION,
ADD COLUMN     "recordLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "GodownRecord" ADD COLUMN     "entryAccuracy" DOUBLE PRECISION,
ADD COLUMN     "entryLat" DOUBLE PRECISION,
ADD COLUMN     "entryLng" DOUBLE PRECISION,
ADD COLUMN     "ervDate" TIMESTAMP(3),
ADD COLUMN     "ervNo" TEXT,
ADD COLUMN     "exitAccuracy" DOUBLE PRECISION,
ADD COLUMN     "exitLat" DOUBLE PRECISION,
ADD COLUMN     "exitLng" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "OfficeTransaction" DROP COLUMN "paymentMode",
ADD COLUMN     "paymentMode" TEXT NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "SalaryPaymentRequest" ADD COLUMN     "managerReviewNote" TEXT,
ADD COLUMN     "managerReviewedAt" TIMESTAMP(3),
ADD COLUMN     "managerReviewedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "customRole" TEXT,
ADD COLUMN     "customRoleId" TEXT,
ADD COLUMN     "twoFactorBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "VehicleTripLog" ADD COLUMN     "departureAccuracy" DOUBLE PRECISION,
ADD COLUMN     "departureLat" DOUBLE PRECISION,
ADD COLUMN     "departureLng" DOUBLE PRECISION,
ADD COLUMN     "returnAccuracy" DOUBLE PRECISION,
ADD COLUMN     "returnLat" DOUBLE PRECISION,
ADD COLUMN     "returnLng" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "casual" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "sick" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "earned" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashfreeTransaction" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentSessionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "plan" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cfPaymentId" TEXT,
    "cfPaymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashfreeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyPayment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'NEFT',
    "referenceNo" TEXT,
    "invoiceNo" TEXT,
    "productId" TEXT,
    "qtyCylinders" INTEGER,
    "oilCompany" TEXT,
    "description" TEXT,
    "agencyId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseRole" "Role" NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkShift" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "gracePeriod" INTEGER NOT NULL DEFAULT 15,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedPunchIn" TIMESTAMP(3),
    "requestedPunchOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalAccount" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "PersonalAccountType" NOT NULL,
    "bankName" TEXT,
    "accountNo" TEXT,
    "ifscCode" TEXT,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isAgencyAccount" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalTransaction" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "PersonalTxnType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "partyName" TEXT,
    "partyPhone" TEXT,
    "paymentMode" TEXT,
    "referenceNo" TEXT,
    "linkedModule" TEXT,
    "linkedRecordId" TEXT,
    "toAccountId" TEXT,
    "udhaariId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "receiptBase64" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalUdhaari" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyPhone" TEXT,
    "partyRelation" TEXT,
    "direction" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "status" "UdhaariStatus" NOT NULL DEFAULT 'OUTSTANDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalUdhaari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdhaariRecovery" (
    "id" TEXT NOT NULL,
    "udhaariId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UdhaariRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UdhaariReminder" (
    "id" TEXT NOT NULL,
    "udhaariId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UdhaariReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChequeRegister" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "chequeNo" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountId" TEXT,
    "chequeDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payeeName" TEXT NOT NULL,
    "purpose" TEXT,
    "status" "ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "presentedDate" TIMESTAMP(3),
    "clearedDate" TIMESTAMP(3),
    "bounceReason" TEXT,
    "linkedCompanyPaymentId" TEXT,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChequeRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OilCompanyLedger" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "oilCompany" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "linkedCompanyPaymentId" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OilCompanyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCashReconciliation" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openingCash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashFromDeliveries" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashFromOffice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashSalaries" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedClosing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualClosing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reconciledById" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FdLoanRecord" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "type" "FdLoanType" NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountRef" TEXT,
    "principalAmount" DOUBLE PRECISION NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3),
    "emiAmount" DOUBLE PRECISION,
    "emiDay" INTEGER,
    "currentValue" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FdLoanRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmiPayment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "penaltyAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "linkedTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmiPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedger" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorPhone" TEXT,
    "vendorType" TEXT NOT NULL,
    "gstNo" TEXT,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditLimit" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorLedgerEntry" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "invoiceNo" TEXT,
    "description" TEXT,
    "paymentMode" TEXT,
    "linkedTxnId" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RolePermission_agencyId_idx" ON "RolePermission"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_agencyId_role_resource_action_key" ON "RolePermission"("agencyId", "role", "resource", "action");

-- CreateIndex
CREATE INDEX "LeaveBalance_agencyId_idx" ON "LeaveBalance"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_agencyId_employeeId_year_key" ON "LeaveBalance"("agencyId", "employeeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CashfreeTransaction_orderId_key" ON "CashfreeTransaction"("orderId");

-- CreateIndex
CREATE INDEX "CashfreeTransaction_agencyId_status_idx" ON "CashfreeTransaction"("agencyId", "status");

-- CreateIndex
CREATE INDEX "CashfreeTransaction_orderId_idx" ON "CashfreeTransaction"("orderId");

-- CreateIndex
CREATE INDEX "CompanyPayment_agencyId_date_idx" ON "CompanyPayment"("agencyId", "date");

-- CreateIndex
CREATE INDEX "CustomRole_agencyId_idx" ON "CustomRole"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_agencyId_name_key" ON "CustomRole"("agencyId", "name");

-- CreateIndex
CREATE INDEX "WorkShift_agencyId_idx" ON "WorkShift"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkShift_agencyId_name_key" ON "WorkShift"("agencyId", "name");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_agencyId_status_idx" ON "AttendanceRegularization"("agencyId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_employeeId_idx" ON "AttendanceRegularization"("employeeId");

-- CreateIndex
CREATE INDEX "PersonalAccount_agencyId_ownerId_idx" ON "PersonalAccount"("agencyId", "ownerId");

-- CreateIndex
CREATE INDEX "PersonalTransaction_agencyId_accountId_date_idx" ON "PersonalTransaction"("agencyId", "accountId", "date");

-- CreateIndex
CREATE INDEX "PersonalTransaction_date_idx" ON "PersonalTransaction"("date");

-- CreateIndex
CREATE INDEX "PersonalUdhaari_agencyId_status_idx" ON "PersonalUdhaari"("agencyId", "status");

-- CreateIndex
CREATE INDEX "ChequeRegister_agencyId_status_idx" ON "ChequeRegister"("agencyId", "status");

-- CreateIndex
CREATE INDEX "ChequeRegister_chequeDate_idx" ON "ChequeRegister"("chequeDate");

-- CreateIndex
CREATE INDEX "OilCompanyLedger_agencyId_oilCompany_idx" ON "OilCompanyLedger"("agencyId", "oilCompany");

-- CreateIndex
CREATE INDEX "DailyCashReconciliation_agencyId_date_idx" ON "DailyCashReconciliation"("agencyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCashReconciliation_agencyId_date_key" ON "DailyCashReconciliation"("agencyId", "date");

-- CreateIndex
CREATE INDEX "FdLoanRecord_agencyId_type_idx" ON "FdLoanRecord"("agencyId", "type");

-- CreateIndex
CREATE INDEX "EmiPayment_recordId_isPaid_idx" ON "EmiPayment"("recordId", "isPaid");

-- CreateIndex
CREATE INDEX "VendorLedger_agencyId_vendorType_idx" ON "VendorLedger"("agencyId", "vendorType");

-- CreateIndex
CREATE INDEX "VendorLedgerEntry_vendorId_date_idx" ON "VendorLedgerEntry"("vendorId", "date");

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPaymentRequest" ADD CONSTRAINT "SalaryPaymentRequest_managerReviewedById_fkey" FOREIGN KEY ("managerReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashfreeTransaction" ADD CONSTRAINT "CashfreeTransaction_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPayment" ADD CONSTRAINT "CompanyPayment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPayment" ADD CONSTRAINT "CompanyPayment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPayment" ADD CONSTRAINT "CompanyPayment_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAccount" ADD CONSTRAINT "PersonalAccount_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalAccount" ADD CONSTRAINT "PersonalAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalTransaction" ADD CONSTRAINT "PersonalTransaction_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalTransaction" ADD CONSTRAINT "PersonalTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PersonalAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalTransaction" ADD CONSTRAINT "PersonalTransaction_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalUdhaari" ADD CONSTRAINT "PersonalUdhaari_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalUdhaari" ADD CONSTRAINT "PersonalUdhaari_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "PersonalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalUdhaari" ADD CONSTRAINT "PersonalUdhaari_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "PersonalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalUdhaari" ADD CONSTRAINT "PersonalUdhaari_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdhaariRecovery" ADD CONSTRAINT "UdhaariRecovery_udhaariId_fkey" FOREIGN KEY ("udhaariId") REFERENCES "PersonalUdhaari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdhaariRecovery" ADD CONSTRAINT "UdhaariRecovery_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UdhaariReminder" ADD CONSTRAINT "UdhaariReminder_udhaariId_fkey" FOREIGN KEY ("udhaariId") REFERENCES "PersonalUdhaari"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChequeRegister" ADD CONSTRAINT "ChequeRegister_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OilCompanyLedger" ADD CONSTRAINT "OilCompanyLedger_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OilCompanyLedger" ADD CONSTRAINT "OilCompanyLedger_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCashReconciliation" ADD CONSTRAINT "DailyCashReconciliation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCashReconciliation" ADD CONSTRAINT "DailyCashReconciliation_reconciledById_fkey" FOREIGN KEY ("reconciledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FdLoanRecord" ADD CONSTRAINT "FdLoanRecord_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FdLoanRecord" ADD CONSTRAINT "FdLoanRecord_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmiPayment" ADD CONSTRAINT "EmiPayment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "FdLoanRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedger" ADD CONSTRAINT "VendorLedger_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorLedger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorLedgerEntry" ADD CONSTRAINT "VendorLedgerEntry_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
