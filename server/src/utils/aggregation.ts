/**
 * Shared MongoDB aggregation helpers for dashboard and admin routes.
 */

export function buildMatchStage(query: {
    dateFrom?: string;
    dateTo?: string;
    testType?: string;
}): Record<string, any> {
    const match: Record<string, any> = {};
    if (query.dateFrom || query.dateTo) {
        match.timestamp = {};
        if (query.dateFrom) match.timestamp.$gte = new Date(query.dateFrom);
        if (query.dateTo) {
            // Date-only strings (YYYY-MM-DD) resolve to midnight — extend to end-of-day
            const d = new Date(query.dateTo);
            if (!query.dateTo.includes("T")) d.setUTCHours(23, 59, 59, 999);
            match.timestamp.$lte = d;
        }
    }
    if (query.testType) match.testType = query.testType;
    return match;
}

export function buildSessionFilter(query: {
    provider?: string;
    entityId?: string;
}): Record<string, any> | null {
    const filter: Record<string, any> = {};
    if (query.provider) filter["session.ipInfo.org"] = query.provider;
    if (query.entityId) filter["session.entityLookup.entityId"] = query.entityId;
    if (Object.keys(filter).length === 0) return null;
    return filter;
}
