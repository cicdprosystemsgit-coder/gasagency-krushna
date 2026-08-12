import { getSessionWithFeatures, requireFeature } from "@/lib/feature-gate";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users } from "lucide-react";
import { StaffManagementClient } from "./StaffManagementClient";

export default async function StaffManagementPage() {
  const session = await getSessionWithFeatures();
  if (!session || session.role !== "ADMIN") redirect("/login");
  requireFeature(session, "staff_management");

  const staff = await prisma.user.findMany({
    where: { agencyId: session.agencyId!, role: { not: "SYSTEM_ADMIN" } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, phone: true, role: true,
      customRole: true, customRoleId: true,
      isActive: true, createdAt: true,
      bankAccountNo: true, bankName: true, ifscCode: true,
      aadhaarNo: true, panNo: true, photoBase64: true,
      salaryProfile: {
        select: {
          monthlySalary: true,
          effectiveFrom: true,
          notes: true,
        }
      }
    },
  });

  return (
    <div>
      <PageHeader
        title="Staff Management"
        subtitle="Manage all staff accounts, roles and access permissions"
        icon={<Users className="w-5 h-5" />}
      />
      <StaffManagementClient initialStaff={staff} />
    </div>
  );
}