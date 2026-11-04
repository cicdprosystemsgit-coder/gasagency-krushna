-- =============================================================================
-- Gasagency — Delete All Customers SQL Script (Safe Foreign Key Order)
-- Removes all customer records and any dependent customer references
-- =============================================================================

BEGIN;

-- 1. Remove references in related tables (if not already deleted)
DELETE FROM "CustomerComplaint";
DELETE FROM "PaymentReceipt";
DELETE FROM "CreditLedgerEntry";
DELETE FROM "RegulatorRecord";
DELETE FROM "CommercialSale";
DELETE FROM "DeliveryRecord";

-- Office transactions can have customerId nullable
UPDATE "OfficeTransaction" SET "customerId" = NULL WHERE "customerId" IS NOT NULL;

-- 2. Delete all customer records
DELETE FROM "Customer";

COMMIT;

