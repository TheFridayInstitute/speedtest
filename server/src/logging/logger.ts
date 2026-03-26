export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    msg: string;
    ts: string;
    [key: string]: unknown;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const minLevel: LogLevel =
    (process.env.LOG_LEVEL as LogLevel) ??
    (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

function write(entry: LogEntry) {
    const out = JSON.stringify(entry);
    if (entry.level === "error") {
        process.stderr.write(out + "\n");
    } else {
        process.stdout.write(out + "\n");
    }
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
    if (!shouldLog(level)) return;
    write({
        level,
        msg,
        ts: new Date().toISOString(),
        ...data,
    });
}

export const logger = {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};
