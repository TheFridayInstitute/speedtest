import { z } from "zod";

/** ISO datetime (with offset) or ISO date string. */
export const optionalDate = z
    .union([z.iso.datetime({ offset: true }), z.iso.date()])
    .optional();

export const metricEnum = z.enum(["download", "upload", "ping", "jitter"]);

export const testTypeEnum = z.enum(["traditional", "dns"]);

export const flowEnum = z.enum(["school", "home"]);

export const intervalEnum = z.enum(["hourly", "daily", "weekly", "monthly"]);

/** A number >= 0, nullable & optional. */
export const positiveNumber = z.number().min(0).nullable().optional();
