import { redirect } from "next/navigation";

export default function AccessManagementRedirectPage() {
  redirect("/admin/security?tab=rbac");
}
