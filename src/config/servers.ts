import type { SpeedtestServer, DNSSpeedtestServer } from "@src/types/server";

/** Default traditional speedtest servers. */
export const DEFAULT_TRADITIONAL_SERVERS: SpeedtestServer[] = [
    {
        name: "Friday Institute Primary",
        server: "https://speedtest.fi.ncsu.edu/schoolwifi/scripts/librespeed/backend/",
        dlURL: "garbage.php",
        ulURL: "empty.php",
        pingURL: "empty.php",
        getIpURL: "getIP.php",
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
