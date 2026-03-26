import { Hono } from "hono";
import { getDb } from "../db.ts";
import type { AppEnv, SurveyDoc } from "../types.ts";
import { surveyBodySchema, parseBody, isResponse } from "../validation/index.ts";

const surveys = new Hono<AppEnv>();

/** Submit a survey response. Requires X-Session-Token. */
surveys.post("/", async (c) => {
    const sessionId = c.get("sessionId");
    if (!sessionId) {
        return c.json({ error: "Session token required" }, 401);
    }

    const body = await parseBody(c, surveyBodySchema);
    if (isResponse(body)) return body;
    const db = await getDb();
    const now = new Date();

    // Fetch session to get IP-derived data
    const session = await db
        .collection("test_sessions")
        .findOne({ _id: sessionId as any });

    const survey: SurveyDoc = {
        sessionId,
        flow: body.flow ?? "home",

        // Common
        name: body.name ?? "",
        address: (body.address as SurveyDoc["address"]) ?? null,
        provider: session?.ipInfo?.org ?? body.provider ?? null,
        entityName:
            session?.entityLookup?.entityName ?? body.entityName ?? null,
        entityId: session?.entityLookup?.entityId ?? body.entityId ?? null,
        psuId: body.psuId ?? null,
        psuName: body.psuName ?? null,

        // School
        schoolName: body.schoolName ?? null,
        schoolNumber: body.schoolNumber ?? null,
        classroomName: body.classroomName ?? null,
        classroomNumber: body.classroomNumber ?? null,

        // Home
        connectionType: body.connectionType ?? null,

        skipped: false,
        createdAt: now,
        updatedAt: now,
    };

    try {
        await db.collection("surveys").insertOne(survey);
        return c.json({ sessionId, flow: survey.flow }, 201);
    } catch (err: any) {
        if (err?.code === 11000) {
            return c.json(
                { error: "Survey already submitted for this session" },
                409,
            );
        }
        throw err;
    }
});

/** Skip the survey. Requires X-Session-Token. */
surveys.post("/skip", async (c) => {
    const sessionId = c.get("sessionId");
    if (!sessionId) {
        return c.json({ error: "Session token required" }, 401);
    }

    const db = await getDb();
    const now = new Date();

    try {
        await db.collection("surveys").insertOne({
            sessionId,
            flow: "home",
            name: "",
            address: null,
            provider: null,
            entityName: null,
            entityId: null,
            psuId: null,
            psuName: null,
            schoolName: null,
            schoolNumber: null,
            classroomName: null,
            classroomNumber: null,
            connectionType: null,
            skipped: true,
            createdAt: now,
            updatedAt: now,
        });
        return c.json({ sessionId, skipped: true }, 201);
    } catch (err: any) {
        if (err?.code === 11000) {
            return c.json(
                { error: "Survey already submitted for this session" },
                409,
            );
        }
        throw err;
    }
});

/** Get survey for a session. */
surveys.get("/:sessionId", async (c) => {
    const db = await getDb();
    const survey = await db
        .collection("surveys")
        .findOne({ sessionId: c.req.param("sessionId") });

    if (!survey) {
        return c.json({ error: "Survey not found" }, 404);
    }

    return c.json(survey);
});

export default surveys;
