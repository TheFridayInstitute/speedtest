import { z } from "zod";
import { flowEnum } from "./primitives.ts";

/** POST /api/surveys — submit survey */
export const surveyBodySchema = z.object({
    flow: flowEnum.default("home"),
    name: z.string().max(500).default(""),
    address: z.record(z.string(), z.unknown()).nullable().optional(),
    provider: z.string().max(500).nullable().optional(),
    entityName: z.string().max(500).nullable().optional(),
    entityId: z.string().max(200).nullable().optional(),
    psuId: z.string().max(200).nullable().optional(),
    psuName: z.string().max(500).nullable().optional(),
    schoolName: z.string().max(500).nullable().optional(),
    schoolNumber: z.string().max(200).nullable().optional(),
    classroomName: z.string().max(500).nullable().optional(),
    classroomNumber: z.string().max(200).nullable().optional(),
    connectionType: z.string().max(200).nullable().optional(),
});
