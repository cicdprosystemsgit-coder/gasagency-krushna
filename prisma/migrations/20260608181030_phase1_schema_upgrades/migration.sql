-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('LOADED', 'OUT_FOR_DELIVERY', 'RETURNED', 'PARTIAL_RETURN');

-- CreateEnum
CREATE TYPE "GodownMoveType" AS ENUM ('RECEIVED', 'DISPATCHED');

-- CreateEnum
CREATE TYPE "SalaryEntryType" AS ENUM ('SALARY', 'DRAWING', 'ADVANCE', 'ADVANCE_RECOVERY', 'BONUS', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('PENDING', 'PARTIAL', 'RECOVERED');

-- CreateEnum
CREATE TYPE "SalaryRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'EARNED', 'HALF_DAY', 'EMERGENCY', 'MATERNITY', 'PATERNITY', 'UNPAID');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "logoBase64" TEXT,
ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'basic',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ADD COLUMN     "whatsappApiKey" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "contactPerson" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gstNumber" TEXT;

-- AlterTable
ALTER TABLE "GodownRecord" ADD COLUMN     "items" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "isCylinder" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aadhaarNo" TEXT,
ADD COLUMN     "bankAccountNo" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ifscCode" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginIp" TEXT,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "panNo" TEXT,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "photoBase64" TEXT,
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "GodownInventory" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "moveType" "GodownMoveType" NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "batchNo" TEXT,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GodownInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryVehicle" (
    "id" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "vehicleName" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL DEFAULT 'Two-Wheeler',
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedToId" TEXT,
    "notes" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleTripLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cylindersLoaded" INTEGER NOT NULL DEFAULT 0,
    "cylindersReturned" INTEGER NOT NULL DEFAULT 0,
    "cylindersDelivered" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB,
    "departureTime" TIMESTAMP(3),
    "returnTime" TIMESTAMP(3),
    "tripStatus" "TripStatus" NOT NULL DEFAULT 'LOADED',
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleTripLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryProfile" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "monthlySalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalaryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "advanceDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "recoveredAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceAmount" DOUBLE PRECISION NOT NULL,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryBonus" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "bonusDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reason" TEXT,
    "remarks" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryPaymentRequest" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER,
    "year" INTEGER,
    "requestData" JSONB NOT NULL,
    "status" "SalaryRequestStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryPaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlacklist" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencySubscription" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageLog" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTarget" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "targetQty" INTEGER NOT NULL,
    "achievedQty" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerComplaint" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assignedToId" TEXT,
    "stops" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryVehicle_assignedToId_key" ON "DeliveryVehicle"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalaryProfile_employeeId_key" ON "EmployeeSalaryProfile"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_agencyId_createdAt_idx" ON "AuditLog"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_jti_idx" ON "RefreshToken"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlacklist_jti_key" ON "TokenBlacklist"("jti");

-- CreateIndex
CREATE INDEX "TokenBlacklist_jti_idx" ON "TokenBlacklist"("jti");

-- CreateIndex
CREATE INDEX "Notification_agencyId_userId_isRead_idx" ON "Notification"("agencyId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySubscription_agencyId_key" ON "AgencySubscription"("agencyId");

-- CreateIndex
CREATE INDEX "AgencySubscription_agencyId_isActive_idx" ON "AgencySubscription"("agencyId", "isActive");

-- CreateIndex
CREATE INDEX "MessageLog_agencyId_channel_status_idx" ON "MessageLog"("agencyId", "channel", "status");

-- CreateIndex
CREATE INDEX "MessageLog_sentAt_idx" ON "MessageLog"("sentAt");

-- CreateIndex
CREATE INDEX "DeliveryTarget_agencyId_year_month_idx" ON "DeliveryTarget"("agencyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryTarget_agencyId_employeeId_month_year_key" ON "DeliveryTarget"("agencyId", "employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "CustomerComplaint_agencyId_status_idx" ON "CustomerComplaint"("agencyId", "status");

-- CreateIndex
CREATE INDEX "CustomerComplaint_customerId_idx" ON "CustomerComplaint"("customerId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_agencyId_isActive_idx" ON "DeliveryRoute"("agencyId", "isActive");

-- AddForeignKey
ALTER TABLE "GodownInventory" ADD CONSTRAINT "GodownInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GodownInventory" ADD CONSTRAINT "GodownInventory_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GodownInventory" ADD CONSTRAINT "GodownInventory_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryVehicle" ADD CONSTRAINT "DeliveryVehicle_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryVehicle" ADD CONSTRAINT "DeliveryVehicle_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTripLog" ADD CONSTRAINT "VehicleTripLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "DeliveryVehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTripLog" ADD CONSTRAINT "VehicleTripLog_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleTripLog" ADD CONSTRAINT "VehicleTripLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryProfile" ADD CONSTRAINT "EmployeeSalaryProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalaryProfile" ADD CONSTRAINT "EmployeeSalaryProfile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryBonus" ADD CONSTRAINT "SalaryBonus_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryBonus" ADD CONSTRAINT "SalaryBonus_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPaymentRequest" ADD CONSTRAINT "SalaryPaymentRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPaymentRequest" ADD CONSTRAINT "SalaryPaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPaymentRequest" ADD CONSTRAINT "SalaryPaymentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryPaymentRequest" ADD CONSTRAINT "SalaryPaymentRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageLog" ADD CONSTRAINT "MessageLog_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTarget" ADD CONSTRAINT "DeliveryTarget_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTarget" ADD CONSTRAINT "DeliveryTarget_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerComplaint" ADD CONSTRAINT "CustomerComplaint_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
