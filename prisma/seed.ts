import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("Cleaning database...");
  await prisma.cashfreeTransaction.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.jobLog.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.document.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.deliveryRoute.deleteMany();
  await prisma.customerComplaint.deleteMany();
  await prisma.deliveryTarget.deleteMany();
  await prisma.messageLog.deleteMany();
  await prisma.agencySubscription.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.salaryPaymentRequest.deleteMany();
  await prisma.salaryBonus.deleteMany();
  await prisma.salaryAdvance.deleteMany();
  await prisma.employeeSalaryProfile.deleteMany();
  await prisma.vehicleTripLog.deleteMany();
  await prisma.deliveryVehicle.deleteMany();
  await prisma.dailyClosing.deleteMany();
  await prisma.gstInvoice.deleteMany();
  await prisma.renewalReminder.deleteMany();
  await prisma.vehicleAgencyAsset.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.salaryDrawing.deleteMany();
  await prisma.creditLedgerEntry.deleteMany();
  await prisma.officeTransaction.deleteMany();
  await prisma.commercialSale.deleteMany();
  await prisma.deliveryRecord.deleteMany();
  await prisma.sectionSummary.deleteMany();
  await prisma.dailySummary.deleteMany();
  await prisma.stockRecord.deleteMany();
  await prisma.godownRecord.deleteMany();
  await prisma.godownInventory.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.demoRequest.deleteMany();

  console.log("Seeding database tables (at least 5 entries per table, only 1 live agency)...");

  // 1. Agencies (Exactly 5 entries, only 1 is ACTIVE)
  const agencies = [
    {
      name: "Sharma Gas Agency",
      slug: "sharma",
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
      status: "ACTIVE" as const,
      plan: "pro",
    },
    {
      name: "Gupta Gas Agency",
      slug: "gupta",
      ownerName: "Anil Gupta",
      email: "info@guptagas.com",
      phone: "9876500001",
      address: "Shop 4, Gandhi Road",
      city: "Mumbai",
      state: "Maharashtra",
      gstin: "27BBBBB0000A1Z5",
      distributorCode: "IND-MUM-002",
      oilCompany: "INDANE",
      licenseNo: "MH-GAS-2016-002",
      status: "INACTIVE" as const,
      plan: "basic",
    },
    {
      name: "Verma Gas Agency",
      slug: "verma",
      ownerName: "Sunil Verma",
      email: "info@vermagas.com",
      phone: "9876500002",
      address: "15/A, Station Road",
      city: "Delhi",
      state: "Delhi",
      gstin: "07CCCCC0000A1Z5",
      distributorCode: "BP-DEL-003",
      oilCompany: "BHARAT GAS",
      licenseNo: "DL-GAS-2017-003",
      status: "INACTIVE" as const,
      plan: "basic",
    },
    {
      name: "Patel Gas Agency",
      slug: "patel",
      ownerName: "Vijay Patel",
      email: "info@patelgas.com",
      phone: "9876500003",
      address: "GF, Patel Tower",
      city: "Ahmedabad",
      state: "Gujarat",
      gstin: "24DDDDD0000A1Z5",
      distributorCode: "HP-AHM-004",
      oilCompany: "HP GAS",
      licenseNo: "GJ-GAS-2018-004",
      status: "SUSPENDED" as const,
      plan: "enterprise",
    },
    {
      name: "Reddy Gas Agency",
      slug: "reddy",
      ownerName: "Karan Reddy",
      email: "info@reddygas.com",
      phone: "9876500004",
      address: "Reddy Enclave",
      city: "Hyderabad",
      state: "Telangana",
      gstin: "36EEEEE0000A1Z5",
      distributorCode: "IND-HYD-005",
      oilCompany: "INDANE",
      licenseNo: "TS-GAS-2019-005",
      status: "SUSPENDED" as const,
      plan: "pro",
    },
  ];

  const createdAgencies = [];
  for (const ag of agencies) {
    const created = await prisma.agency.create({ data: ag });
    createdAgencies.push(created);
  }

  const activeAgency = createdAgencies.find(a => a.status === "ACTIVE")!;
  const agencyId = activeAgency.id;

  // 2. Users (5 users under active agency, plus 1 system admin)
  const saPwd = await bcrypt.hash("superadmin123", 12);
  const systemAdmin = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: "superadmin@gasplatform.com",
      password: saPwd,
      role: "SYSTEM_ADMIN",
      phone: "9000000000",
    },
  });

  const usersData = [
    { name: "Admin User",    email: "admin@gasagency.com",    pwd: "admin123",    role: "ADMIN"         as const, phone: "9876543210" },
    { name: "Suresh Manager",email: "manager@gasagency.com",  pwd: "manager123",  role: "MANAGER"       as const, phone: "9876543211" },
    { name: "Ramesh Godown", email: "godown@gasagency.com",   pwd: "godown123",   role: "GODOWN_KEEPER" as const, phone: "9876543212" },
    { name: "Priya Staff",   email: "staff@gasagency.com",    pwd: "staff123",    role: "STAFF"         as const, phone: "9876543213" },
    { name: "Raju Delivery", email: "delivery@gasagency.com", pwd: "delivery123", role: "DELIVERY_BOY"  as const, phone: "9876543214" },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const hashed = await bcrypt.hash(u.pwd, 12);
    const user = await prisma.user.create({
      data: { name: u.name, email: u.email, password: hashed, role: u.role, phone: u.phone, agencyId },
    });
    createdUsers.push(user);
  }

  const adminUser = createdUsers.find(u => u.role === "ADMIN")!;
  const managerUser = createdUsers.find(u => u.role === "MANAGER")!;
  const godownUser = createdUsers.find(u => u.role === "GODOWN_KEEPER")!;
  const staffUser = createdUsers.find(u => u.role === "STAFF")!;
  const deliveryUser = createdUsers.find(u => u.role === "DELIVERY_BOY")!;

  // 3. Products (5 entries)
  const productsData = [
    { name: "14.2 KG Domestic Cylinder", unitCost: 700,  saleRate: 920,  margin: 220, hsnCode: "2711", gstRate: 5 },
    { name: "5 KG Cylinder",             unitCost: 350,  saleRate: 460,  margin: 110, hsnCode: "2711", gstRate: 5 },
    { name: "19 KG Commercial Cylinder", unitCost: 1400, saleRate: 1750, margin: 350, hsnCode: "2711", gstRate: 18 },
    { name: "47 KG Industrial Cylinder", unitCost: 3200, saleRate: 3800, margin: 600, hsnCode: "2711", gstRate: 18 },
    { name: "Regulator (Standard)",      unitCost: 120,  saleRate: 200,  margin: 80,  hsnCode: "8481", gstRate: 18 },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const created = await prisma.product.create({ data: { ...p, agencyId } });
    createdProducts.push(created);
  }

  // 4. Customers (5 entries)
  const customersData = [
    { name: "Sharma Restaurant",   phone: "9811234567", address: "MG Road, Main Market", type: "COMMERCIAL" as const },
    { name: "Green Valley Hotel",  phone: "9822234567", address: "Station Road",         type: "COMMERCIAL" as const },
    { name: "City Public School",  phone: "9833234567", address: "Sector 15",            type: "COMMERCIAL" as const },
    { name: "New Hospital Canteen",phone: "9844234567", address: "Hospital Road",        type: "COMMERCIAL" as const },
    { name: "John Doe Home",       phone: "9855234567", address: "Apartment 123",        type: "DOMESTIC" as const },
  ];

  const createdCustomers = [];
  for (const c of customersData) {
    const created = await prisma.customer.create({ data: { ...c, agencyId } });
    createdCustomers.push(created);
  }

  // 5. GodownInventory (5 entries)
  const godownInventories = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.godownInventory.create({
      data: {
        date: new Date(),
        moveType: i % 2 === 0 ? "RECEIVED" : "DISPATCHED",
        productId: createdProducts[i % createdProducts.length].id,
        qty: 10 + i * 5,
        batchNo: `BATCH-00${i + 1}`,
        notes: `Inventory movement ${i + 1}`,
        recordedById: godownUser.id,
        agencyId,
      },
    });
    godownInventories.push(record);
  }

  // 6. GodownRecord (5 entries)
  const godownRecords = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.godownRecord.create({
      data: {
        vehicleNo: `MH-12-XX-900${i}`,
        entryDate: new Date(),
        filledCylindersReceived: 50 + i * 10,
        emptyCylindersReturned: 45 + i * 10,
        items: [
          { productId: createdProducts[0].id, productName: createdProducts[0].name, filledReceived: 30, emptyReturned: 25 },
        ],
        notes: `Godown entry log ${i + 1}`,
        status: "APPROVED",
        submittedById: godownUser.id,
        agencyId,
        approvedAt: new Date(),
      },
    });
    godownRecords.push(record);
  }

  // 7. StockRecord (5 entries)
  const stockRecords = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.stockRecord.create({
      data: {
        date: new Date(),
        productId: createdProducts[i % createdProducts.length].id,
        agencyId,
        openingStock: 100,
        loadingIn: 50,
        salesQty: 30,
        returned: 10,
        closingStock: 130,
      },
    });
    stockRecords.push(record);
  }

  // 8. DailySummary (5 entries)
  const dailySummaries = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.dailySummary.create({
      data: {
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        submittedById: staffUser.id,
        summaryData: { totalSales: 5000 + i * 1000, deliveriesCompleted: 20 + i },
        status: "APPROVED",
        managerNote: "Looks good",
        approvedByManagerId: managerUser.id,
        managerApprovedAt: new Date(),
        approvedByAdminId: adminUser.id,
        adminApprovedAt: new Date(),
        agencyId,
      },
    });
    dailySummaries.push(record);
  }

  // 9. SectionSummary (5 entries)
  const sectionSummaries = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.sectionSummary.create({
      data: {
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        sectionType: "SALES",
        data: { cashSales: 3000, creditSales: 1500 },
        status: "APPROVED",
        adminApprovedAt: new Date(),
        agencyId,
      },
    });
    sectionSummaries.push(record);
  }

  // 10. DeliveryRecord (5 entries)
  const deliveryRecords = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.deliveryRecord.create({
      data: {
        date: new Date(),
        customerId: createdCustomers[i % createdCustomers.length].id,
        productId: createdProducts[i % createdProducts.length].id,
        deliveredQty: 2,
        returnedQty: 2,
        pendingQty: 0,
        cashCollected: 1840,
        status: "DELIVERED",
        notes: `Delivery ${i + 1}`,
        deliveredById: deliveryUser.id,
        agencyId,
      },
    });
    deliveryRecords.push(record);
  }

  // 11. CommercialSale (5 entries)
  const commercialSales = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.commercialSale.create({
      data: {
        date: new Date(),
        customerId: createdCustomers[i % createdCustomers.length].id,
        productId: createdProducts[i % createdProducts.length].id,
        qty: 5,
        rate: 1750,
        amount: 8750,
        cashCollected: 8000,
        udhariNew: 750,
        udhariPrev: 0,
        balance: 750,
        addedById: staffUser.id,
        agencyId,
      },
    });
    commercialSales.push(record);
  }

  // 12. OfficeTransaction (5 entries)
  const officeTransactions = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.officeTransaction.create({
      data: {
        date: new Date(),
        type: "CYLINDER_REFILL",
        inventoryId: createdProducts[i % createdProducts.length].id,
        description: `Office refill order ${i + 1}`,
        qty: 1,
        unitRate: 920,
        amount: 920,
        paymentMode: "CASH",
        remarks: "Completed",
        addedById: staffUser.id,
        agencyId,
      },
    });
    officeTransactions.push(record);
  }

  // 13. CreditLedgerEntry (5 entries)
  const creditLedgerEntries = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.creditLedgerEntry.create({
      data: {
        date: new Date(),
        customerId: createdCustomers[i % createdCustomers.length].id,
        type: i % 2 === 0 ? "DEBIT" : "CREDIT",
        amount: 500 + i * 100,
        description: `Credit ledger entry ${i + 1}`,
        addedById: staffUser.id,
        agencyId,
      },
    });
    creditLedgerEntries.push(record);
  }

  // 14. SalaryDrawing (5 entries)
  const salaryDrawings = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.salaryDrawing.create({
      data: {
        date: new Date(),
        employeeId: deliveryUser.id,
        type: "DRAWING",
        amount: 2000,
        month: 6,
        year: 2026,
        remarks: `Drawing cash ${i + 1}`,
        agencyId,
      },
    });
    salaryDrawings.push(record);
  }

  // 15. ExpenseCategory (5 entries)
  const expenseCategories = [];
  const catNames = ["Fuel", "Rent", "Salary", "Office Supplies", "Electricity"];
  for (let i = 0; i < 5; i++) {
    const category = await prisma.expenseCategory.create({
      data: {
        agencyId,
        name: catNames[i],
        monthlyBudget: 5000 + i * 1000,
        color: i === 0 ? "#EF4444" : i === 1 ? "#3B82F6" : i === 2 ? "#10B981" : i === 3 ? "#F59E0B" : "#8B5CF6",
        isActive: true,
      },
    });
    expenseCategories.push(category);
  }

  // 16. Expense (5 entries)
  const expenses = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.expense.create({
      data: {
        date: new Date(),
        description: `Office expense ${i + 1}`,
        amount: 150 + i * 50,
        category: expenseCategories[i].name,
        categoryId: expenseCategories[i].id,
        addedById: staffUser.id,
        agencyId,
      },
    });
    expenses.push(record);
  }

  // 17. VehicleAgencyAsset (5 entries)
  const vehicleAssets = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.vehicleAgencyAsset.create({
      data: {
        assetType: i < 3 ? "VEHICLE" : "AGENCY",
        name: i < 3 ? `MH-12-DE-100${i}` : `License / Certificate ${i}`,
        registrationDate: new Date("2021-01-01"),
        lastRenewalDate: new Date("2025-01-01"),
        nextRenewalDate: new Date("2026-12-31"),
        price: i < 3 ? 120000 : 5000,
        comment: `Asset entry ${i + 1}`,
        isActive: true,
        agencyId,
      },
    });
    vehicleAssets.push(record);
  }

  // 18. RenewalReminder (5 entries)
  const renewalReminders = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.renewalReminder.create({
      data: {
        assetId: vehicleAssets[i % vehicleAssets.length].id,
        type: "INSURANCE",
        dueDate: new Date("2026-12-31"),
        isDismissed: false,
      },
    });
    renewalReminders.push(record);
  }

  // 19. GstInvoice (5 entries)
  const gstInvoices = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.gstInvoice.create({
      data: {
        date: new Date(),
        invoiceNo: `INV-2026-000${i + 1}`,
        customerId: createdCustomers[i % createdCustomers.length].id,
        items: [
          { productName: createdProducts[0].name, qty: 1, rate: 920, gstRate: 5, gstAmount: 46, amount: 966 },
        ],
        subtotal: 920,
        gstAmount: 46,
        total: 966,
        status: "APPROVED",
        agencyId,
      },
    });
    gstInvoices.push(record);
  }

  // 20. DailyClosing (5 entries)
  const dailyClosings = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.dailyClosing.create({
      data: {
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        totalDeliveries: 10 + i,
        totalCollection: 9200 + i * 1000,
        pendingDeliveries: 2,
        returnedCylinders: 1,
        notes: `Daily closing report ${i + 1}`,
        status: "APPROVED",
        managerApprovedAt: new Date(),
        adminApprovedAt: new Date(),
        agencyId,
      },
    });
    dailyClosings.push(record);
  }

  // 21. DemoRequest (5 entries)
  const demoRequests = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.demoRequest.create({
      data: {
        name: `Lead Name ${i + 1}`,
        phone: `990000000${i}`,
        email: `lead${i + 1}@example.com`,
        status: "NEW",
        notes: `Demo request ${i + 1}`,
      },
    });
    demoRequests.push(record);
  }

  // 22. DeliveryVehicle (5 entries)
  const deliveryVehicles = [];
  const boys = [deliveryUser.id, null, null, null, null];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.deliveryVehicle.create({
      data: {
        vehicleNo: `MH-12-DEL-900${i}`,
        vehicleName: `Delivery Bike ${i + 1}`,
        vehicleType: "Two-Wheeler",
        status: "ACTIVE",
        assignedToId: boys[i],
        notes: `Vehicle details ${i + 1}`,
        agencyId,
      },
    });
    deliveryVehicles.push(record);
  }

  // 23. VehicleTripLog (5 entries)
  const tripLogs = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.vehicleTripLog.create({
      data: {
        vehicleId: deliveryVehicles[0].id,
        date: new Date(),
        cylindersLoaded: 10,
        cylindersReturned: 2,
        cylindersDelivered: 8,
        items: [
          { productId: createdProducts[0].id, loaded: 10, unsoldReturned: 2, emptyReturned: 8 },
        ],
        departureTime: new Date(),
        returnTime: new Date(),
        tripStatus: "RETURNED",
        notes: `Trip completed successfully ${i + 1}`,
        recordedById: godownUser.id,
        agencyId,
      },
    });
    tripLogs.push(record);
  }

  // 24. EmployeeSalaryProfile (5 entries)
  const salaryProfiles = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.employeeSalaryProfile.create({
      data: {
        employeeId: createdUsers[i].id,
        monthlySalary: 15000 + i * 2000,
        effectiveFrom: new Date("2026-01-01"),
        notes: `Base salary plan ${i + 1}`,
        agencyId,
      },
    });
    salaryProfiles.push(record);
  }

  // 25. SalaryAdvance (5 entries)
  const salaryAdvances = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.salaryAdvance.create({
      data: {
        employeeId: deliveryUser.id,
        advanceDate: new Date(),
        amount: 3000,
        recoveredAmount: 1000,
        balanceAmount: 2000,
        status: "PARTIAL",
        reason: `Festival advance ${i + 1}`,
        notes: `Advance ledger ${i + 1}`,
        agencyId,
      },
    });
    salaryAdvances.push(record);
  }

  // 26. SalaryBonus (5 entries)
  const salaryBonuses = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.salaryBonus.create({
      data: {
        employeeId: deliveryUser.id,
        bonusDate: new Date(),
        amount: 1500,
        month: 6,
        year: 2026,
        reason: "Performance",
        remarks: `Bonus payouts ${i + 1}`,
        agencyId,
      },
    });
    salaryBonuses.push(record);
  }

  // 27. SalaryPaymentRequest (5 entries)
  const salaryRequests = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.salaryPaymentRequest.create({
      data: {
        type: "SALARY",
        employeeId: staffUser.id,
        amount: 18000,
        month: 6,
        year: 2026,
        requestData: { advanceRecovery: 0, netSalary: 18000 },
        status: "PENDING",
        remarks: `Monthly request ${i + 1}`,
        requestedById: managerUser.id,
        agencyId,
      },
    });
    salaryRequests.push(record);
  }

  // 28. LeaveRequest (5 entries)
  const leaveRequests = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.leaveRequest.create({
      data: {
        employeeId: staffUser.id,
        leaveType: "SICK",
        startDate: new Date(),
        endDate: new Date(),
        totalDays: 1,
        reason: `Not feeling well ${i + 1}`,
        status: "PENDING",
        agencyId,
      },
    });
    leaveRequests.push(record);
  }

  // 29. AuditLog (5 entries)
  const auditLogs = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.auditLog.create({
      data: {
        agencyId,
        userId: adminUser.id,
        action: `ACTION_PERFORMED_${i + 1}`,
        entityType: "Product",
        entityId: createdProducts[0].id,
        details: { action: "update", modifiedField: "saleRate" },
        ipAddress: "127.0.0.1",
      },
    });
    auditLogs.push(record);
  }

  // 30. RefreshToken (5 entries)
  const refreshTokens = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.refreshToken.create({
      data: {
        jti: `jti-token-id-00${i + 1}`,
        userId: adminUser.id,
        tokenHash: `token-hash-mock-${i + 1}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        ipAddress: "127.0.0.1",
        userAgent: "Browser/UserAgent",
      },
    });
    refreshTokens.push(record);
  }

  // 31. TokenBlacklist (5 entries)
  const blacklistedTokens = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.tokenBlacklist.create({
      data: {
        jti: `blacklist-jti-00${i + 1}`,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    blacklistedTokens.push(record);
  }

  // 32. Notification (5 entries)
  const notifications = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.notification.create({
      data: {
        agencyId,
        userId: adminUser.id,
        type: "LOW_STOCK",
        title: `Alert: Low Stock ${i + 1}`,
        body: `Inventory count is below the minimum threshold.`,
        isRead: false,
        link: "/admin/products",
      },
    });
    notifications.push(record);
  }

  // 33. AgencySubscription (5 entries - one for each agency)
  const subscriptions = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.agencySubscription.create({
      data: {
        agencyId: createdAgencies[i].id,
        plan: createdAgencies[i].plan,
        billingCycle: "monthly",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        amount: createdAgencies[i].plan === "basic" ? 1999 : createdAgencies[i].plan === "pro" ? 4999 : 9999,
        paymentRef: `pay_ref_code_00${i + 1}`,
      },
    });
    subscriptions.push(record);
  }

  // 34. MessageLog (5 entries)
  const messageLogs = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.messageLog.create({
      data: {
        agencyId,
        recipient: "9876543210",
        type: "DELIVERY_REMINDER",
        channel: "WHATSAPP",
        status: "DELIVERED",
        payload: { recipient: "9876543210", message: `Reminder ${i + 1}` },
      },
    });
    messageLogs.push(record);
  }

  // 35. DeliveryTarget (5 entries)
  const deliveryTargets = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.deliveryTarget.create({
      data: {
        agencyId,
        employeeId: deliveryUser.id,
        month: i + 1,
        year: 2026,
        targetQty: 100 + i * 20,
        achievedQty: 80 + i * 10,
      },
    });
    deliveryTargets.push(record);
  }

  // 36. CustomerComplaint (5 entries)
  const complaints = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.customerComplaint.create({
      data: {
        agencyId,
        customerId: createdCustomers[i % createdCustomers.length].id,
        category: "DELIVERY_DELAY",
        description: `The delivery was delayed by more than 4 hours ${i + 1}`,
        status: "OPEN",
      },
    });
    complaints.push(record);
  }

  // 37. DeliveryRoute (5 entries)
  const deliveryRoutes = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.deliveryRoute.create({
      data: {
        agencyId,
        name: `Route Plan - Sector ${i + 1}`,
        assignedToId: deliveryUser.id,
        stops: [
          { customerId: createdCustomers[0].id, customerName: createdCustomers[0].name, order: 1 },
          { customerId: createdCustomers[1].id, customerName: createdCustomers[1].name, order: 2 },
        ],
        isActive: true,
      },
    });
    deliveryRoutes.push(record);
  }

  // 38. Attendance (5 entries)
  const attendanceRecords = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.attendance.create({
      data: {
        agencyId,
        employeeId: deliveryUser.id,
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        punchIn: new Date(),
        punchOut: new Date(),
        status: "PRESENT",
      },
    });
    attendanceRecords.push(record);
  }

  // 39. PaymentReceipt (5 entries)
  const paymentReceipts = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.paymentReceipt.create({
      data: {
        agencyId,
        customerId: createdCustomers[i % createdCustomers.length].id,
        amount: 920,
        paymentMode: "UPI",
        utrNo: `UTR-UPI-REF-00${i + 1}`,
        receiptNo: `RCP-2026-000${i + 1}`,
        collectedById: deliveryUser.id,
        date: new Date(),
        notes: `UPI receipt entry ${i + 1}`,
      },
    });
    paymentReceipts.push(record);
  }

  // 40. Document (5 entries)
  const documents = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.document.create({
      data: {
        agencyId,
        entityType: "USER",
        entityId: deliveryUser.id,
        docType: "AADHAAR",
        fileName: `aadhaar_card_${i + 1}.pdf`,
        fileBase64: "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nHsvCxwFBAEAAg==\n",
        mimeType: "application/pdf",
        uploadedById: adminUser.id,
      },
    });
    documents.push(record);
  }

  // 41. Branch (5 entries)
  const branches = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.branch.create({
      data: {
        agencyId,
        name: `Branch Office ${i + 1}`,
        address: `Sector ${i + 1}, Pune City`,
        city: "Pune",
        phone: `900000000${i}`,
        managerId: managerUser.id,
        isActive: true,
      },
    });
    branches.push(record);
  }

  // 42. ApiKey (5 entries)
  const apiKeys = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.apiKey.create({
      data: {
        agencyId,
        name: `Integration Key ${i + 1}`,
        keyHash: `mock-api-key-hash-00${i + 1}`,
        prefix: `gak_test${i + 1}`,
        scopes: ["customers:read", "deliveries:read"],
        isActive: true,
      },
    });
    apiKeys.push(record);
  }

  // 43. Webhook (5 entries)
  const webhooks = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.webhook.create({
      data: {
        agencyId,
        url: `https://webhook.site/test-endpoint-${i + 1}`,
        events: ["delivery.completed", "payment.received"],
        secret: `hmac-secret-signature-00${i + 1}`,
        isActive: true,
      },
    });
    webhooks.push(record);
  }

  // 44. JobLog (5 entries)
  const jobLogs = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.jobLog.create({
      data: {
        agencyId,
        jobName: "daily-stock-snapshot",
        status: "SUCCESS",
        startedAt: new Date(),
        finishedAt: new Date(),
        meta: { processedProducts: 5 },
      },
    });
    jobLogs.push(record);
  }

  // 45. RolePermission (5 entries)
  const rolePermissions = [];
  const resources = ["customers", "salaries", "godown", "billing", "expenses"];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.rolePermission.create({
      data: {
        agencyId,
        role: "MANAGER",
        resource: resources[i],
        action: "read",
        isAllowed: true,
      },
    });
    rolePermissions.push(record);
  }

  // 46. LeaveBalance (5 entries)
  const leaveBalances = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.leaveBalance.create({
      data: {
        agencyId,
        employeeId: createdUsers[i].id,
        year: 2026,
        casual: 12,
        sick: 10,
        earned: 10,
      },
    });
    leaveBalances.push(record);
  }

  // 47. CashfreeTransaction (5 entries)
  const cashfreeTransactions = [];
  for (let i = 0; i < 5; i++) {
    const record = await prisma.cashfreeTransaction.create({
      data: {
        agencyId,
        orderId: `gak_${agencyId}_${1718010000 + i}`,
        paymentSessionId: `session_id_mock_cf_00${i + 1}`,
        amount: 4999,
        plan: "pro",
        billingCycle: "monthly",
        status: "PAID",
        cfPaymentId: `cf_payment_id_val_00${i + 1}`,
        cfPaymentStatus: "SUCCESS",
      },
    });
    cashfreeTransactions.push(record);
  }

  console.log("\nSeed complete successfully!\n");
  console.log("System Admin:");
  console.log("  superadmin@gasplatform.com / superadmin123\n");
  console.log("Active Live Agency (Sharma Gas Agency):");
  console.log("  admin@gasagency.com     / admin123");
  console.log("  manager@gasagency.com   / manager123");
  console.log("  godown@gasagency.com    / godown123");
  console.log("  staff@gasagency.com     / staff123");
  console.log("  delivery@gasagency.com  / delivery123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
