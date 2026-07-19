import { inngest } from "./client";
import { prisma } from "@/lib/prisma";

// ── Job 1: Daily Stock Snapshot ───────────────────────────────────────────────
export const dailyStockSnapshot = inngest.createFunction(
  { id: "daily-stock-snapshot", triggers: [{ cron: "29 18 * * *" }] }, // 11:59 PM IST
  async ({ step }: { step: any }) => {
    const agencies = await step.run("fetch-agencies", async () =>
      prisma.agency.findMany({ select: { id: true, name: true } })
    );

    const snapshots = await step.run("capture-snapshots", async () => {
      const results = [];
      for (const agency of agencies as { id: string; name: string }[]) {
        const moves = await prisma.godownInventory.findMany({
          where: { agencyId: agency.id },
          include: { product: { select: { name: true } } },
        });

        await prisma.jobLog.create({
          data: {
            agencyId: agency.id,
            jobName: "daily-stock-snapshot",
            status: "SUCCESS",
            finishedAt: new Date(),
            meta: { itemCount: moves.length },
          },
        });

        results.push({ agencyId: agency.id, moveCount: moves.length });
      }
      return results;
    });

    return { processed: snapshots.length };
  }
);

// ── Job 2: Document Expiry Reminder (daily, 30-day window) ───────────────────
export const documentExpiryReminder = inngest.createFunction(
  { id: "document-expiry-reminder", triggers: [{ cron: "30 3 * * *" }] }, // 9 AM IST
  async ({ step }: { step: any }) => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const expiring = await step.run("find-expiring-docs", async () =>
      prisma.document.findMany({
        where: { expiryDate: { gte: now, lte: in30 } },
        include: { uploadedBy: { select: { name: true } } },
      })
    );

    const notified = await step.run("create-notifications", async () => {
      let count = 0;
      for (const doc of expiring as any[]) {
        const daysLeft = Math.ceil((new Date(doc.expiryDate).getTime() - now.getTime()) / 86400000);
        const admins = await prisma.user.findMany({
          where: { agencyId: doc.agencyId, role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
          select: { id: true },
        });
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                agencyId: doc.agencyId,
                userId: admin.id,
                type: "DOCUMENT_EXPIRY",
                title: `Document Expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
                body: `${doc.docType} — ${doc.fileName}`,
                link: "/admin/documents",
              },
            })
          )
        );
        count += admins.length;
      }
      return count;
    });

    return { alertsSent: notified };
  }
);

// ── Job 3: Weekly Renewal Reminder (7-day window) ─────────────────────────────
export const weeklyRenewalReminder = inngest.createFunction(
  { id: "weekly-renewal-reminder", triggers: [{ cron: "0 3 * * 1" }] }, // 8:30 AM IST every Monday
  async ({ step }: { step: any }) => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);

    const [expiringDocs, expiringAssets] = await step.run("find-expiring", async () =>
      Promise.all([
        prisma.document.findMany({
          where: { expiryDate: { gte: now, lte: in7 } },
          select: { agencyId: true, docType: true, fileName: true, entityType: true },
        }),
        prisma.vehicleAgencyAsset.findMany({
          where: { nextRenewalDate: { gte: now, lte: in7 }, isActive: true },
          select: { agencyId: true, name: true, nextRenewalDate: true, assetType: true },
        }),
      ])
    );

    await step.run("send-notifications", async () => {
      const byAgency = new Map<string, { docs: any[]; assets: any[] }>();

      for (const doc of expiringDocs as any[]) {
        if (!byAgency.has(doc.agencyId)) byAgency.set(doc.agencyId, { docs: [], assets: [] });
        byAgency.get(doc.agencyId)!.docs.push(doc);
      }
      for (const asset of expiringAssets as any[]) {
        if (!byAgency.has(asset.agencyId)) byAgency.set(asset.agencyId, { docs: [], assets: [] });
        byAgency.get(asset.agencyId)!.assets.push(asset);
      }

      for (const [agencyId, { docs, assets }] of byAgency) {
        const admins = await prisma.user.findMany({
          where: { agencyId, role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
          select: { id: true },
        });

        const total = docs.length + assets.length;
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                agencyId,
                userId: admin.id,
                type: "RENEWAL_DUE",
                title: `${total} renewal${total !== 1 ? "s" : ""} due within 7 days`,
                body: [
                  docs.length ? `${docs.length} document(s) expiring` : "",
                  assets.length ? `${assets.length} vehicle/agency renewal(s) due` : "",
                ].filter(Boolean).join(", "),
                link: "/admin/documents",
              },
            })
          )
        );
      }
    });

    return { processed: (expiringDocs as any[]).length + (expiringAssets as any[]).length };
  }
);

// ── Job 4: Monthly Payroll Reminder ───────────────────────────────────────────
export const monthlyPayrollSummary = inngest.createFunction(
  { id: "monthly-payroll-summary", triggers: [{ cron: "30 2 1 * *" }] }, // 8 AM IST on 1st
  async ({ step }: { step: any }) => {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const agencies = await step.run("fetch-agencies", async () =>
      prisma.agency.findMany({ select: { id: true } })
    );

    await step.run("notify-payroll-due", async () => {
      for (const agency of agencies as { id: string }[]) {
        const admins = await prisma.user.findMany({
          where: { agencyId: agency.id, role: "ADMIN", isActive: true },
          select: { id: true },
        });
        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                agencyId: agency.id,
                userId: admin.id,
                type: "PAYROLL_DUE",
                title: "Monthly Payroll Due",
                body: `Time to process salaries for ${prevMonth}/${prevYear}.`,
                link: "/admin/salaries",
              },
            })
          )
        );
      }
    });

    return { notified: agencies.length };
  }
);

// ── Job 5: Low Stock Alert (event-driven) ─────────────────────────────────────
export const lowStockAlert = inngest.createFunction(
  { id: "low-stock-alert", triggers: [{ event: "inventory/low-stock" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { agencyId, productName, currentStock, threshold } = event.data as {
      agencyId: string; productName: string; currentStock: number; threshold: number;
    };

    await step.run("notify-admins", async () => {
      const admins = await prisma.user.findMany({
        where: { agencyId, role: { in: ["ADMIN", "MANAGER", "GODOWN_KEEPER"] }, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              agencyId,
              userId: admin.id,
              type: "LOW_STOCK",
              title: "Low Stock Alert",
              body: `${productName} has only ${currentStock} cylinders (threshold: ${threshold}).`,
              link: "/admin/inventory",
            },
          })
        )
      );
    });

    return { alerted: true };
  }
);

// ── Job 6: Bulk Salary Slip Dispatch (event-driven) ───────────────────────────
export const bulkSalarySlipDispatch = inngest.createFunction(
  { id: "bulk-salary-slip-dispatch", triggers: [{ event: "salary/bulk-dispatch" }] },
  async ({ event, step }: { event: any; step: any }) => {
    const { agencyId, month, year } = event.data as { agencyId: string; month: number; year: number };

    const employees = await step.run("fetch-employees", async () =>
      prisma.user.findMany({
        where: { agencyId, isActive: true, phone: { not: null } },
        select: { id: true, name: true, phone: true },
      })
    );

    await step.run("log-dispatch", async () => {
      await prisma.jobLog.create({
        data: {
          agencyId,
          jobName: "bulk-salary-slip-dispatch",
          status: "SUCCESS",
          finishedAt: new Date(),
          meta: { month, year, count: employees.length },
        },
      });
    });

    return { dispatched: employees.length };
  }
);

// ── Job 7: Daily Attendance Absenteeism Alert ───────────────────────────────
export const dailyAttendanceAlert = inngest.createFunction(
  { id: "daily-attendance-alert", triggers: [{ cron: "30 4 * * *" }] }, // 10:00 AM IST
  async ({ step }: { step: any }) => {
    const agencies = await step.run("fetch-agencies", async () =>
      prisma.agency.findMany({ select: { id: true } })
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await step.run("check-absentees", async () => {
      let alertCount = 0;
      for (const agency of agencies as { id: string }[]) {
        const activeEmployees = await prisma.user.findMany({
          where: {
            agencyId: agency.id,
            isActive: true,
            role: { not: "SYSTEM_ADMIN" },
          },
          select: { id: true, name: true, role: true },
        });

        if (activeEmployees.length === 0) continue;

        const punchedRecords = await prisma.attendance.findMany({
          where: {
            agencyId: agency.id,
            date: today,
            status: { in: ["PRESENT", "HALF_DAY", "ON_LEAVE"] },
          },
          select: { employeeId: true },
        });

        const punchedIds = new Set(punchedRecords.map((r) => r.employeeId));
        const absentees = activeEmployees.filter(
          (emp) => emp.role !== "ADMIN" && !punchedIds.has(emp.id)
        );

        if (absentees.length > 0) {
          const admins = await prisma.user.findMany({
            where: { agencyId: agency.id, role: "ADMIN", isActive: true },
            select: { id: true },
          });

          const namesStr = absentees.map((e) => e.name).join(", ");
          await Promise.all(
            admins.map((admin) =>
              prisma.notification.create({
                data: {
                  agencyId: agency.id,
                  userId: admin.id,
                  type: "ATTENDANCE_ABSENT_ALERT",
                  title: "Absenteeism Alert",
                  body: `${absentees.length} employees haven't punched in yet: ${namesStr}`,
                  link: "/admin/attendance",
                },
              })
            )
          );
          alertCount += admins.length;
        }
      }
      return alertCount;
    });

    return { alertsSent: result };
  }
);

export const functions = [
  dailyStockSnapshot,
  documentExpiryReminder,
  weeklyRenewalReminder,
  monthlyPayrollSummary,
  lowStockAlert,
  bulkSalarySlipDispatch,
  dailyAttendanceAlert,
];
