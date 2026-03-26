import { z } from "zod";
import { testTypeEnum, positiveNumber } from "./primitives.ts";

/** POST /api/results — submit speedtest result */
export const resultBodySchema = z.object({
    testType: testTypeEnum.default("traditional"),
    serverId: z.string().max(200).default(""),
    serverName: z.string().max(500).default(""),
    download: positiveNumber,
    upload: positiveNumber,
    ping: positiveNumber,
    jitter: positiveNumber,
    dnsDownloadSpeed: positiveNumber,
    dnsUid: z.string().max(200).nullable().optional(),
    raw: z.any().optional(),
});
