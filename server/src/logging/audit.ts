import { getDb } from "../db.ts";

export interface AuditEntry {
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    requestId?: string;
    ip?: string;
    timestamp: Date;
}

/**
 * Logs an admin action to the audit_log collection.
 * Fire-and-forget — does not block the request.
 */
export function auditLog(entry: Omit<AuditEntry, "timestamp">) {
    getDb()
        .then((db) =>
            db.collection("audit_log").insertOne({
                ...entry,
                timestamp: new Date(),
            }),
        )
        .catch(() => {});
}
