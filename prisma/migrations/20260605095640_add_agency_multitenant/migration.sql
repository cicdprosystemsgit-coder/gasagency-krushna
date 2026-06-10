-- ============================================================
-- Production-safe migration: Add multi-tenant Agency support
--
-- Strategy:
--   1. Create Agency table + enums
--   2. Insert a default Agency to absorb all existing data
--   3. Add agencyId columns as NULLABLE
--   4. Backfill every existing row → default Agency
--   5. Make columns NOT NULL (User.agencyId stays nullable for SYSTEM_ADMIN)
--   6. Add foreign key constraints
-- ============================================================

-- Step 1a: Create new enum
CREATE TYPE "AgencyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- Step 1b: Add SYSTEM_ADMIN to Role enum
ALTER TYPE "Role" ADD VALUE 'SYSTEM_ADMIN';

-- Step 1c: Drop old unique index on customerCode (made non-unique)
DROP INDEX IF EXISTS "Customer_customerCode_key";

-- Step 1d: Create Agency table
CREATE TABLE "Agency" (
    "id"              TEXT          NOT NULL,
    "name"            TEXT          NOT NULL,
    "ownerName"       TEXT          NOT NULL,
    "email"           TEXT          NOT NULL,
    "phone"           TEXT          NOT NULL,
    "address"         TEXT          NOT NULL,
    "city"            TEXT          NOT NULL,
    "state"           TEXT          NOT NULL,
    "gstin"           TEXT,
    "distributorCode" TEXT,
    "oilCompany"      TEXT,
    "licenseNo"       TEXT,
    "status"          "AgencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan"            TEXT          NOT NULL DEFAULT 'basic',
    "notes"           TEXT,
    "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Agency_email_key" ON "Agency"("email");

-- Step 2: Insert default agency to absorb all existing data
INSERT INTO "Agency" ("id","name","ownerName","email","phone","address","city","state","plan","status","updatedAt")
VALUES (
  'default-agency-existing',
  'Sharma Gas Agency',
  'Admin User',
  'info@sharmagas.com',
  '9876543210',
  'Main Market',
  'Pune',
  'Maharashtra',
  'pro',
  'ACTIVE',
  NOW()
);

-- Step 3: Add agencyId columns as NULLABLE (safe for tables with existing rows)
ALTER TABLE "User"             ADD COLUMN "agencyId" TEXT;
ALTER TABLE "Product"          ADD COLUMN "agencyId" TEXT;
ALTER TABLE "Customer"         ADD COLUMN "agencyId" TEXT;
ALTER TABLE "GodownRecord"     ADD COLUMN "agencyId" TEXT;
ALTER TABLE "StockRecord"      ADD COLUMN "agencyId" TEXT;
ALTER TABLE "DailySummary"     ADD COLUMN "agencyId" TEXT;
ALTER TABLE "SectionSummary"   ADD COLUMN "agencyId" TEXT;
ALTER TABLE "DeliveryRecord"   ADD COLUMN "agencyId" TEXT;
ALTER TABLE "CommercialSale"   ADD COLUMN "agencyId" TEXT;
ALTER TABLE "OfficeTransaction" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "CreditLedgerEntry" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "SalaryDrawing"    ADD COLUMN "agencyId" TEXT;
ALTER TABLE "Expense"          ADD COLUMN "agencyId" TEXT;
ALTER TABLE "VehicleAgencyAsset" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "GstInvoice"       ADD COLUMN "agencyId" TEXT;
ALTER TABLE "DailyClosing"     ADD COLUMN "agencyId" TEXT;

-- Step 4: Backfill — assign all existing rows to the default agency
UPDATE "User"             SET "agencyId" = 'default-agency-existing';
UPDATE "Product"          SET "agencyId" = 'default-agency-existing';
UPDATE "Customer"         SET "agencyId" = 'default-agency-existing';
UPDATE "GodownRecord"     SET "agencyId" = 'default-agency-existing';
UPDATE "StockRecord"      SET "agencyId" = 'default-agency-existing';
UPDATE "DailySummary"     SET "agencyId" = 'default-agency-existing';
UPDATE "SectionSummary"   SET "agencyId" = 'default-agency-existing';
UPDATE "DeliveryRecord"   SET "agencyId" = 'default-agency-existing';
UPDATE "CommercialSale"   SET "agencyId" = 'default-agency-existing';
UPDATE "OfficeTransaction" SET "agencyId" = 'default-agency-existing';
UPDATE "CreditLedgerEntry" SET "agencyId" = 'default-agency-existing';
UPDATE "SalaryDrawing"    SET "agencyId" = 'default-agency-existing';
UPDATE "Expense"          SET "agencyId" = 'default-agency-existing';
UPDATE "VehicleAgencyAsset" SET "agencyId" = 'default-agency-existing';
UPDATE "GstInvoice"       SET "agencyId" = 'default-agency-existing';
UPDATE "DailyClosing"     SET "agencyId" = 'default-agency-existing';

-- Step 5: Apply NOT NULL constraint (User.agencyId stays nullable — SYSTEM_ADMIN has no agency)
ALTER TABLE "Product"           ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "Customer"          ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "GodownRecord"      ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "StockRecord"       ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "DailySummary"      ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "SectionSummary"    ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "DeliveryRecord"    ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "CommercialSale"    ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "OfficeTransaction" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "CreditLedgerEntry" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "SalaryDrawing"     ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "Expense"           ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "VehicleAgencyAsset" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "GstInvoice"        ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "DailyClosing"      ALTER COLUMN "agencyId" SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE "User"             ADD CONSTRAINT "User_agencyId_fkey"             FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE SET NULL    ON UPDATE CASCADE;
ALTER TABLE "Product"          ADD CONSTRAINT "Product_agencyId_fkey"          FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "Customer"         ADD CONSTRAINT "Customer_agencyId_fkey"         FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "GodownRecord"     ADD CONSTRAINT "GodownRecord_agencyId_fkey"     FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "StockRecord"      ADD CONSTRAINT "StockRecord_agencyId_fkey"      FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "DailySummary"     ADD CONSTRAINT "DailySummary_agencyId_fkey"     FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "SectionSummary"   ADD CONSTRAINT "SectionSummary_agencyId_fkey"   FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "DeliveryRecord"   ADD CONSTRAINT "DeliveryRecord_agencyId_fkey"   FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "CommercialSale"   ADD CONSTRAINT "CommercialSale_agencyId_fkey"   FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "OfficeTransaction" ADD CONSTRAINT "OfficeTransaction_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "CreditLedgerEntry" ADD CONSTRAINT "CreditLedgerEntry_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT  ON UPDATE CASCADE;
ALTER TABLE "SalaryDrawing"    ADD CONSTRAINT "SalaryDrawing_agencyId_fkey"    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "Expense"          ADD CONSTRAINT "Expense_agencyId_fkey"          FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "VehicleAgencyAsset" ADD CONSTRAINT "VehicleAgencyAsset_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GstInvoice"       ADD CONSTRAINT "GstInvoice_agencyId_fkey"       FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
ALTER TABLE "DailyClosing"     ADD CONSTRAINT "DailyClosing_agencyId_fkey"     FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT    ON UPDATE CASCADE;
