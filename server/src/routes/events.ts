import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eventBus } from "../events/bus.ts";
import { adminAuth } from "../middleware.ts";
import type { AppEnv } from "../types.ts";

const events = new Hono<AppEnv>();

/** Public SSE stream — emits obfuscated new_result events. */
events.get("/results", (c) => {
    return streamSSE(c, async (stream) => {
        const onResult = (data: any) => {
            // Obfuscated: only send aggregate-friendly fields
            const message = {
                h3Index: data.h3Index ?? null,
                download: data.download ?? null,
                upload: data.upload ?? null,
                ping: data.ping ?? null,
                jitter: data.jitter ?? null,
                timestamp: data.timestamp ?? new Date().toISOString(),
            };
            stream
                .writeSSE({
                    data: JSON.stringify(message),
                    event: "new_result",
                })
                .catch(() => {
                    // Client disconnected
                });
        };

        eventBus.on("new_result", onResult);

        // Send initial keepalive
        await stream.writeSSE({
            data: JSON.stringify({ type: "connected" }),
            event: "keepalive",
        });

        // Keep the stream open until the client disconnects
        // The stream.onAbort callback handles cleanup
        stream.onAbort(() => {
            eventBus.off("new_result", onResult);
        });

        // Keep alive with periodic pings
        while (true) {
            await stream.sleep(30_000);
            await stream.writeSSE({
                data: "",
                event: "ping",
            });
        }
    });
});

/** Admin SSE stream — full result details, requires auth. */
events.get("/admin/results", adminAuth, (c) => {
    return streamSSE(c, async (stream) => {
        const onResult = (data: any) => {
            stream
                .writeSSE({
                    data: JSON.stringify(data),
                    event: "new_result",
                })
                .catch(() => {
                    // Client disconnected
                });
        };

        eventBus.on("new_result", onResult);

        await stream.writeSSE({
            data: JSON.stringify({ type: "connected" }),
            event: "keepalive",
        });

        stream.onAbort(() => {
            eventBus.off("new_result", onResult);
        });

        while (true) {
            await stream.sleep(30_000);
            await stream.writeSSE({
                data: "",
                event: "ping",
            });
        }
    });
});

export default events;
