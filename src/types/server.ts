/** Traditional speedtest server definition (LibreSpeed format). */
export interface SpeedtestServer {
    name: string;
    server: string;
    dlURL: string;
    ulURL: string;
    pingURL: string;
    getIpURL: string;
    pingT?: number;
}

/** DNS-based speedtest server definition. */
export interface DNSSpeedtestServer {
    name: string;
    dnsEndpoint: string;
    resultsEndpoint: string;
}

/** Result from a single traditional speedtest run against one server. */
export interface SpeedtestResult {
    serverId: string;
    serverName: string;
    download: number;
    upload: number;
    ping: number;
    jitter: number;
    clientIp: string;
    timestamp: number;
}

/** Result from a single DNS speedtest run against one server. */
export interface DNSSpeedtestResultData {
    serverId: string;
    serverName: string;
    speedtest_dl_speed: number | null;
    uid: string;
    timestamp: number;
    raw?: Record<string, unknown>;
    status?: "pending" | "complete";
    [key: string]: unknown;
}

/** Aggregated results across multiple servers. */
export interface AggregatedResult {
    medianDownload: number;
    medianUpload: number;
    medianPing: number;
    averageDownload: number;
    averageUpload: number;
    averagePing: number;
    perServer: Array<{
        serverId: string;
        serverName: string;
        result: SpeedtestResult | DNSSpeedtestResultData;
    }>;
}
