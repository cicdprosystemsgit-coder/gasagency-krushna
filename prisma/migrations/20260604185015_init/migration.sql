-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'GODOWN_KEEPER', 'STAFF', 'DELIVERY_BOY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_NEEDED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'ONLINE', 'CREDIT');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('NEW_CONNECTION', 'REGULATOR', 'PIPE', 'OTHER', 'CYLINDER_REFILL');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('DOMESTIC', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "VehicleAssetType" AS ENUM ('VEHICLE', 'AGENCY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saleRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "type" "CustomerType" NOT NULL DEFAULT 'DOMESTIC',
    "customerCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GodownRecord" (
    "id" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "filledCylindersReceived" INTEGER NOT NULL,
    "emptyCylindersReturned" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GodownRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "openingStock" INTEGER NOT NULL DEFAULT 0,
    "loadingIn" INTEGER NOT NULL DEFAULT 0,
    "salesQty" INTEGER NOT NULL DEFAULT 0,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "closingStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySummary" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "summaryData" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "managerNote" TEXT,
    "approvedByManagerId" TEXT,
    "managerApprovedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "adminApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSummary" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sectionType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "adminApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deliveredQty" INTEGER NOT NULL DEFAULT 0,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    "pendingQty" INTEGER NOT NULL DEFAULT 0,
    "cashCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DELIVERED',
    "notes" TEXT,
    "deliveredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cashCollected" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "udhariNew" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "udhariPrev" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "inventoryId" TEXT,
    "description" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH',
    "remarks" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLedgerEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryDrawing" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryDrawing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleAgencyAsset" (
    "id" TEXT NOT NULL,
    "assetType" "VehicleAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3) NOT NULL,
    "lastRenewalDate" TIMESTAMP(3),
    "nextRenewalDate" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleAgencyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RenewalReminder" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RenewalReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GstInvoice" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gstAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GstInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyClosing" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalDeliveries" INTEGER NOT NULL DEFAULT 0,
    "totalCollection" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingDeliveries" INTEGER NOT NULL DEFAULT 0,
    "returnedCylinders" INTEGER NOT NULL DEFAULT 0,
    "cashOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "managerApprovedAt" TIMESTAMP(3),
    "adminApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyClosing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "GstInvoice_invoiceNo_key" ON "GstInvoice"("invoiceNo");

-- AddForeignKey
ALTER TABLE "GodownRecord" ADD CONSTRAINT "GodownRecord_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockRecord" ADD CONSTRAINT "StockRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_approvedByManagerId_fkey" FOREIGN KEY ("approvedByManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySummary" ADD CONSTRAINT "DailySummary_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_deliveredById_fkey" FOREIGN KEY ("deliveredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSale" ADD CONSTRAINT "CommercialSale_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryDrawing" ADD CONSTRAINT "SalaryDrawing_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalReminder" ADD CONSTRAINT "RenewalReminder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "VehicleAgencyAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
