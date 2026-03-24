/** Filters for dashboard result queries. */
export interface DashboardFilters {
    dateFrom: string;
    dateTo: string;
    testType: string;
    psuId: string;
    entityId: string;
    flow: string;
}

/** A single row in the results table (joined from results + session + survey). */
export interface DashboardResultRow {
    _id: string;
    timestamp: string;
    testType: string;
    serverName: string;
    download: number | null;
    upload: number | null;
    ping: number | null;
    jitter: number | null;
    session?: {
        clientIp: string;
        ipInfo?: { org?: string };
        entityLookup?: { entityName?: string; entityId?: string };
    };
    survey?: {
        flow: string;
        name: string;
        schoolName?: string;
        schoolNumber?: string;
        skipped: boolean;
    };
}

/** Aggregate stats from /api/admin/stats. */
export interface DashboardStats {
    totalResults: number;
    totalSessions: number;
    totalSurveys: number;
    trieEntries: number;
    averages: {
        download: number;
        upload: number;
        ping: number;
    };
}

/** A subnet mapping row for the IP lookup manager. */
export interface SubnetRow {
    _id: string;
    cidr: string;
    prefix: string;
    prefixLength: number;
    entityName: string;
    entityId: string;
    entityType: string;
    networkType: string;
    source: string;
    active: boolean;
}
