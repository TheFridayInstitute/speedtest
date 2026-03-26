import { Hono } from "hono";
import type { AppEnv } from "../../types.js";

import hexMapRoute from "./hex-map.js";
import timeSeriesRoute from "./time-series.js";
import distributionsRoute from "./distributions.js";
import summaryRoute from "./summary.js";

const dashboard = new Hono<AppEnv>();

dashboard.route("/hex-map", hexMapRoute);
dashboard.route("/time-series", timeSeriesRoute);
dashboard.route("/distributions", distributionsRoute);
dashboard.route("/summary", summaryRoute);

export default dashboard;
