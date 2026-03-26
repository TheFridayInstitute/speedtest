import type { Db, ObjectId } from "mongodb";

// ── Hono env ──────────────────────────────────────────────────────────

export type AppEnv = {
    Variables: {
        sessionId: string | undefined;
        clientIp: string;
        requestId: string;
        db: Db;
    };
};

// ── MongoDB documents ─────────────────────────────────────────────────

export interface H3Indices {
    res4: string;
    res5: string;
    res6: string;
    res7: string;
}

export interface TestSessionDoc {
    _id: string; // UUID, used as session token
    clientIp: string;
    ipHash: string;
    ipInfo: IPInfoData | null;
    h3Indices: H3Indices | null;
    entityLookup: EntityLookupData | null;
    userAgent: string;
    createdAt: Date;
    lastSeenAt: Date;
    expiresAt: Date;
}

export interface TestResultDoc {
    _id?: ObjectId;
    sessionId: string;
    testType: "traditional" | "dns";
    serverId: string;
    serverName: string;

    // Traditional
    download: number | null;
    upload: number | null;
    ping: number | null;
    jitter: number | null;

    // DNS
    dnsDownloadSpeed: number | null;
    dnsUid: string | null;

    timestamp: Date;
    raw?: Record<string, unknown>;
}

export interface SurveyDoc {
    _id?: ObjectId;
    sessionId: string;
    flow: "school" | "home";

    // Common
    name: string;
    address: AddressData | null;
    provider: string | null;
    entityName: string | null;
    entityId: string | null;
    psuId: string | null;
    psuName: string | null;

    // School
    schoolName: string | null;
    schoolNumber: string | null;
    classroomName: string | null;
    classroomNumber: string | null;

    // Home
    connectionType: string | null;

    skipped: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SubnetDoc {
    _id?: ObjectId;
    prefix: string;
    prefixLength: number;
    cidr: string;
    entityName: string;
    entityId: string;
    entityType: string;
    networkType: string;
    metadata: Record<string, unknown>;
    source: "sheets_sync" | "manual" | "csv_import";
    sourceRef?: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPInfoCacheDoc {
    _id?: ObjectId;
    ip: string;
    data: IPInfoData;
    fetchedAt: Date;
}

export interface ShodanCacheDoc {
    _id?: ObjectId;
    ip: string;
    data: ShodanData;
    fetchedAt: Date;
}

export interface SyncMetadataDoc {
    _id?: ObjectId;
    name: string;
    spreadsheetId: string;
    range: string;
    columnMapping: ColumnMapping;
    lastSyncAt: Date | null;
    lastSyncResult: SyncResult | null;
    syncEnabled: boolean;
    createdAt: Date;
}

// ── Embedded types ────────────────────────────────────────────────────

export interface IPInfoData {
    ip?: string;
    org?: string;
    isp?: string;
    asn?: string;
    city?: string;
    region?: string;
    country?: string;
    loc?: string;
    hostname?: string;
    [key: string]: unknown;
}

export interface ShodanData {
    ports?: number[];
    os?: string | null;
    hostnames?: string[];
    vulns?: string[];
    isp?: string;
    org?: string;
    asn?: string;
    [key: string]: unknown;
}

export interface EntityLookupData {
    entityName: string;
    entityId: string;
    entityType?: string;
    cidr?: string;
    [key: string]: unknown;
}

export interface AddressData {
    formatted: string;
    placeId?: string;
    lat?: number;
    lng?: number;
    components: Record<string, string>;
}

export interface ColumnMapping {
    prefix: string;
    prefixLength: string;
    entityName: string;
    entityId?: string;
    entityType?: string;
    networkType?: string;
}

export interface SyncResult {
    created: number;
    updated: number;
    deactivated: number;
    errors: string[];
}

// ── Enriched IP response ──────────────────────────────────────────────

export interface EnrichedIPInfo {
    ip: string;
    org: string | null;
    isp: string | null;
    asn: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    loc: string | null;
    shodan?: {
        ports: number[];
        os: string | null;
        hostnames: string[];
        vulns: string[];
    } | null;
    entity?: {
        entityName: string;
        entityId: string;
        entityType: string;
        cidr: string;
    } | null;
}
