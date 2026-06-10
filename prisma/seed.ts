import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("Seeding database...");

  // 1. System Admin (no agency)
  const saPwd = await bcrypt.hash("superadmin123", 12);
  await prisma.user.upsert({
    where: { email: "superadmin@gasplatform.com" },
    update: {},
    create: {
      name: "Platform Admin",
      email: "superadmin@gasplatform.com",
      password: saPwd,
      role: "SYSTEM_ADMIN",
      phone: "9000000000",
    },
  });

  // 2. Demo Agency
  let agency = await prisma.agency.findUnique({ where: { email: "info@sharmagas.com" } });
  if (!agency) {
    agency = await prisma.agency.create({
      data: {
        name: "Sharma Gas Agency",
        ownerName: "Ramesh Sharma",
        email: "info@sharmagas.com",
        phone: "9876500000",
        address: "Shop No. 12, Main Market",
        city: "Pune",
        state: "Maharashtra",
        gstin: "27AAAAA0000A1Z5",
        distributorCode: "HP-PUNE-001",
        oilCompany: "HP GAS",
        licenseNo: "MH-GAS-2015-001",
        plan: "pro",
      },
    });
  }
  const agencyId = agency.id;

  // 3. Agency Users
  const roles = [
    { name: "Admin User",    email: "admin@gasagency.com",    pwd: "admin123",    role: "ADMIN"         as const, phone: "9876543210" },
    { name: "Suresh Manager",email: "manager@gasagency.com",  pwd: "manager123",  role: "MANAGER"       as const, phone: "9876543211" },
    { name: "Ramesh Godown", email: "godown@gasagency.com",   pwd: "godown123",   role: "GODOWN_KEEPER" as const, phone: "9876543212" },
    { name: "Priya Staff",   email: "staff@gasagency.com",    pwd: "staff123",    role: "STAFF"         as const, phone: "9876543213" },
    { name: "Raju Delivery", email: "delivery@gasagency.com", pwd: "delivery123", role: "DELIVERY_BOY"  as const, phone: "9876543214" },
  ];

  for (const u of roles) {
    const hashed = await bcrypt.hash(u.pwd, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { agencyId },
      create: { name: u.name, email: u.email, password: hashed, role: u.role, phone: u.phone, agencyId },
    });
  }

  // 4. Products
  const products = [
    { name: "14.2 KG Domestic Cylinder", unitCost: 700,  saleRate: 920,  margin: 220 },
    { name: "5 KG Cylinder",             unitCost: 350,  saleRate: 460,  margin: 110 },
    { name: "19 KG Commercial Cylinder", unitCost: 1400, saleRate: 1750, margin: 350 },
    { name: "47 KG Industrial Cylinder", unitCost: 3200, saleRate: 3800, margin: 600 },
    { name: "Regulator (Standard)",      unitCost: 120,  saleRate: 200,  margin: 80  },
    { name: "Pipe Set (1 meter)",        unitCost: 60,   saleRate: 100,  margin: 40  },
    { name: "New Connection Kit",        unitCost: 800,  saleRate: 1200, margin: 400 },
  ];

  for (const p of products) {
    const id = p.name.slice(0, 10);
    const existing = await prisma.product.findFirst({ where: { name: p.name, agencyId } });
    if (!existing) {
      await prisma.product.create({ data: { ...p, agencyId } });
    }
  }

  // 5. Customers
  const customers = [
    { name: "Sharma Restaurant",   phone: "9811234567", address: "MG Road, Main Market", type: "COMMERCIAL" as const },
    { name: "Green Valley Hotel",  phone: "9822234567", address: "Station Road",         type: "COMMERCIAL" as const },
    { name: "City Public School",  phone: "9833234567", address: "Sector 15",            type: "COMMERCIAL" as const },
    { name: "New Hospital Canteen",phone: "9844234567", address: "Hospital Road",        type: "COMMERCIAL" as const },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone, agencyId } });
    if (!existing) {
      await prisma.customer.create({ data: { ...c, agencyId } });
    }
  }

  // 6. Assets
  const assetCheck = await prisma.vehicleAgencyAsset.findFirst({ where: { name: "MH12AB5678", agencyId } });
  if (!assetCheck) {
    await prisma.vehicleAgencyAsset.create({
      data: {
        assetType: "VEHICLE", name: "MH12AB5678",
        registrationDate: new Date("2020-03-15"),
        lastRenewalDate:  new Date("2024-03-15"),
        nextRenewalDate:  new Date("2026-06-30"),
        price: 450000, comment: "Main delivery vehicle", agencyId,
      },
    });
  }

  const licenseCheck = await prisma.vehicleAgencyAsset.findFirst({ where: { name: "Gas Agency License", agencyId } });
  if (!licenseCheck) {
    await prisma.vehicleAgencyAsset.create({
      data: {
        assetType: "AGENCY", name: "Gas Agency License",
        registrationDate: new Date("2015-01-01"),
        lastRenewalDate:  new Date("2025-01-01"),
        nextRenewalDate:  new Date("2026-07-15"),
        price: 25000, comment: "Annual renewal required", agencyId,
      },
    });
  }

  console.log("\nSeed complete!\n");
  console.log("System Admin:");
  console.log("  superadmin@gasplatform.com / superadmin123\n");
  console.log("Agency Users (Sharma Gas Agency):");
  console.log("  admin@gasagency.com     / admin123");
  console.log("  manager@gasagency.com   / manager123");
  console.log("  godown@gasagency.com    / godown123");
  console.log("  staff@gasagency.com     / staff123");
  console.log("  delivery@gasagency.com  / delivery123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
