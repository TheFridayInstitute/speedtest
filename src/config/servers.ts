import type { SpeedtestServer, DNSSpeedtestServer } from "@src/types/server";

/** Default traditional speedtest servers. */
export const DEFAULT_TRADITIONAL_SERVERS: SpeedtestServer[] = [
    {
        name: "Friday Institute Primary",
        server: "/api/speedtest/",
        dlURL: "garbage",
        ulURL: "empty",
        pingURL: "empty",
        getIpURL: "getIP",
    },
];

/** Default DNS speedtest servers. */
export const DEFAULT_DNS_SERVERS: DNSSpeedtestServer[] = [
    {
        name: "Friday Institute DNS",
        dnsEndpoint: "dns.friday.institute",
        resultsEndpoint: "ip.friday.institute",
    },
];
