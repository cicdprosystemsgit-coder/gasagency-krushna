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
  console.log("=== STARTING CUSTOMER DELETION ===");

  if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is missing. Please check your .env or .env.production file.");
    process.exit(1);
  }

  const { prisma } = await import("../src/lib/prisma");
  prismaInstance = prisma;

  const initialCount = await prisma.customer.count();
  console.log(`Found ${initialCount} customers currently in database.`);

  if (initialCount === 0) {
    console.log("Customer table is already empty (0 records).");
    return;
  }

  console.log("Cleaning up dependent records (deliveries, credit ledger, complaints)...");
  await prisma.customerComplaint.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.creditLedgerEntry.deleteMany();
  await prisma.regulatorRecord.deleteMany();
  await prisma.commercialSale.deleteMany();
  await prisma.deliveryRecord.deleteMany();

  // Nullify any customerId references in office transactions
  await prisma.officeTransaction.updateMany({
    where: { customerId: { not: null } },
    data: { customerId: null },
  });

  console.log(`Deleting ${initialCount} customers...`);
  const deleted = await prisma.customer.deleteMany({});
  console.log(`✅ Successfully deleted ${deleted.count} customers.`);

  const remaining = await prisma.customer.count();
  console.log(`Remaining customers in database: ${remaining}`);
}

main()
  .catch((err) => {
    console.error("❌ Customer deletion failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    if (prismaInstance) {
      await prismaInstance.$disconnect();
    }
  });

