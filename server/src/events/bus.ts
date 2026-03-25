import { EventEmitter } from "events";
import { invalidateDashboardCache } from "../middleware.js";

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

// Invalidate cached dashboard data when new results arrive
eventBus.on("new_result", () => {
    invalidateDashboardCache();
});
