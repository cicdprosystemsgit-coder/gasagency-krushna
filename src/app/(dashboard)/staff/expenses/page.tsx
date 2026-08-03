import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyEmployeeExpenses } from "@/app/actions/expenses";
import EmployeeExpenseClient from "./EmployeeExpenseClient";

export const dynamic = "force-dynamic";

export default async function StaffExpensesPage() {
  const session = await getSession();
  if (!session || !session.agencyId) {
    redirect("/login");
  }

  // Fetch user profile info
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, role: true },
  });

  if (!user) redirect("/login");

  // Fetch expense categories
  const categories = await prisma.expenseCategory.findMany({
    where: { agencyId: session.agencyId, isActive: true },
    select: { id: true, name: true, color: true },
    orderBy: { name: "asc" },
  });

  const { expenses } = await getMyEmployeeExpenses();

  return (
    <EmployeeExpenseClient
      user={{ name: user.name, email: user.email, role: user.role }}
      categories={categories}
      initialExpenses={expenses as any}
    />
  );
}
