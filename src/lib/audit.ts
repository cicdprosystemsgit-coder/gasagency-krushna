import { prisma } from "@/lib/prisma";

export interface AuditParams {
  userId:     string;
  agencyId?:  string | null;
  action:     string;        // e.g. "CREATE_SALARY_DRAWING"
  entityType: string;        // e.g. "SalaryDrawing"
  entityId?:  string;
  before?:    object;        // snapshot before change
  after?:     object;        // snapshot after change
  ipAddress?: string;
}

/**
 * Write an immutable audit log entry.
 * Errors are swallowed — audit log failures must never break main operations.
 */
export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId:     params.userId,
        agencyId:   params.agencyId ?? null,
        action:     params.action,
        entityType: params.entityType,
        entityId:   params.entityId ?? null,
        details:    { before: params.before ?? null, after: params.after ?? null },
        ipAddress:  params.ipAddress ?? null,
      },
    });
  } catch (e) {
    console.error("[AuditLog] Failed to write:", e);
  }
}

// ─── Convenience action constants ─────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  // Staff
  CREATE_STAFF:        "CREATE_STAFF",
  UPDATE_STAFF:        "UPDATE_STAFF",
  DELETE_STAFF:        "DELETE_STAFF",
  TOGGLE_STAFF:        "TOGGLE_STAFF",
  // Salary
  CREATE_SALARY:       "CREATE_SALARY_DRAWING",
  DELETE_SALARY:       "DELETE_SALARY_DRAWING",
  CREATE_ADVANCE:      "CREATE_ADVANCE",
  RECOVER_ADVANCE:     "RECOVER_ADVANCE",
  DELETE_ADVANCE:      "DELETE_ADVANCE",
  CREATE_BONUS:        "CREATE_BONUS",
  DELETE_BONUS:        "DELETE_BONUS",
  // Customer
  CREATE_CUSTOMER:     "CREATE_CUSTOMER",
  UPDATE_CUSTOMER:     "UPDATE_CUSTOMER",
  DELETE_CUSTOMER:     "DELETE_CUSTOMER",
  TOGGLE_CUSTOMER:     "TOGGLE_CUSTOMER",
  // Agency (system admin)
  CREATE_AGENCY:       "CREATE_AGENCY",
  UPDATE_AGENCY:       "UPDATE_AGENCY",
  UPDATE_AGENCY_STATUS:"UPDATE_AGENCY_STATUS",
  // Auth
  LOGIN:               "LOGIN",
  LOGOUT:              "LOGOUT",
  CHANGE_PASSWORD:     "CHANGE_PASSWORD",
  // Phase 3
  CREATE_API_KEY:      "CREATE_API_KEY",
  REVOKE_API_KEY:      "REVOKE_API_KEY",
  CREATE_BRANCH:       "CREATE_BRANCH",
  UPDATE_BRANCH:       "UPDATE_BRANCH",
  ENABLE_2FA:          "ENABLE_2FA",
  DISABLE_2FA:         "DISABLE_2FA",
} as const;

/** Alias matching Phase 3 naming convention */
export const createAuditLog = (params: Omit<AuditParams, "before" | "after"> & { oldData?: object; newData?: object }) =>
  writeAuditLog({ ...params, before: params.oldData, after: params.newData });
