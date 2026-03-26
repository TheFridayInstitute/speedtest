import { Hono } from "hono";
import type { AppEnv } from "../../types.ts";

import hexMapRoute from "./hex-map.ts";
import timeSeriesRoute from "./time-series.ts";
import distributionsRoute from "./distributions.ts";
import summaryRoute from "./summary.ts";

const dashboard = new Hono<AppEnv>();

dashboard.route("/hex-map", hexMapRoute);
dashboard.route("/time-series", timeSeriesRoute);
dashboard.route("/distributions", distributionsRoute);
dashboard.route("/summary", summaryRoute);

export default dashboard;
