import { CylinderLoader } from "@/components/ui/CylinderLoader";
import React from "react";

export default function SystemAdminLoading() {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center p-6">
      <CylinderLoader
        size="lg"
        color="blue"
        message="Loading System Admin"
        subtitle="Retrieving multi-tenant platform metrics..."
      />
    </div>
  );
}
