# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Vue 3 SPA)                                    │
│  ┌───────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Speedtest  │  │  Survey   │  │     Dashboard      │  │
│  │  Worker    │  │  Wizard   │  │  (Map + Charts)    │  │
│  └─────┬─────┘  └─────┬─────┘  └─────────┬──────────┘  │
│        │              │                   │              │
└────────┼──────────────┼───────────────────┼──────────────┘
         │              │                   │
         ▼              ▼                   ▼
┌────────────────────────────────────────────────────────┐
│  Hono API (Node.js 22)                                 │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐  │
│  │ speedtest │ │ sessions │ │  results   │ │ events │  │
│  │ endpoints │ │          │ │ + surveys  │ │  (SSE) │  │
│  └──────────┘ └──────────┘ └──────┬─────┘ └────────┘  │
│  ┌──────────┐ ┌──────────┐        │       ┌────────┐  │
│  │  admin   │ │ public-  │        │       │  CIDR  │  │
│  │          │ │dashboard │        │       │  Trie  │  │
│  └──────────┘ └──────────┘        │       └────────┘  │
│                                   │                    │
└───────────────────────────────────┼────────────────────┘
                                    │
                                    ▼
                           ┌────────────────┐
                           │   MongoDB 8    │
                           │  ┌──────────┐  │
                           │  │ sessions │  │
                           │  │ results  │  │
                           │  │ surveys  │  │
                           │  │ subnets  │  │
                           │  │ servers  │  │
                           │  └──────────┘  │
                           └────────────────┘
```

EC2 speedtest servers run separately as lightweight containers (`Dockerfile.speedtest`). They register with the central API via heartbeat and serve only the LibreSpeed download/upload/ping endpoints.

## Frontend Architecture

### Vue 3 + Router + Pinia

The frontend is a single-page app built with Vue 3's Composition API, using `vue-router` for client-side routing and Pinia for shared state.

**Routes** (`src/router/index.ts`):

- `/`—speedtest view (test execution)
- `/survey`—multi-step survey wizard
- `/thankyou`—post-survey thank you
- `/dashboard/map`—public hex-binned map
- `/dashboard/charts`—public analytics charts
- `/admin/overview`—admin summary stats
- `/admin/data`—admin results table with filters
- `/admin/charts`—admin analytics
- `/admin/map`—admin map view
- `/admin/settings`—server management, subnet import

Legacy redirects (`/admin/results`, `/admin/sessions`, `/admin/subnets`, `/admin/servers`) point to their current equivalents.

**Layouts** separate the chrome from the content. `AdminDashboardLayout.vue` provides the admin nav tabs; `PublicDashboardLayout.vue` provides the public-facing dashboard shell.

**Pinia stores** (`src/stores/`):

- `useDashboardFilterStore`—cross-filtering state shared between map, charts, and table. Holds date range, metric selection, entity filters, and geographic bounds. Any component can read/write filters, and all visualization components react.
- `useAdminDashboardDataStore`—admin data fetching, pagination, and aggregation.
- `usePublicDashboardDataStore`—public dashboard data with cached responses.

### Glass-UI and Tailwind v4

The design system is built on `@mkbabb/glass-ui`, consumed as a local file dependency. Glass-ui provides glassmorphic component primitives—backdrop-blur panels, frosted overlays, shimmer effects. We compose with its CSS utility classes rather than reimplementing glass effects.

Tailwind v4 handles utility styling. The entry point is `styles/style.css` which imports Tailwind and extends `@theme` with design tokens. `styles/tokens.css` defines the color palette, font stack, shadow system, and spacing scale. `styles/animations.css` defines keyframe animations. `styles/glass.css` contains glass-ui overrides specific to this project, and `styles/dock.css` styles the macOS-style dock component.

### Composables

Shared logic lives in `src/composables/`:

- `useAPI`—typed API client for the Hono backend. Manages session tokens via localStorage, provides `createSession`, `submitResult`, `submitSurvey`, etc.
- `useSpeedtest`—wraps the LibreSpeed worker, manages test lifecycle (idle/running/complete), exposes reactive download/upload/ping/jitter values. Handles cleanup on unmount.
- `useIPInfo`—ipinfo.io lookups for client IP geolocation.
- `useServerManager`—multi-server selection, latency probing, heartbeat monitoring.
- `useAppNavigation`—tab navigation state between speedtest, survey, and dashboard views.
- `useGeolocation`—browser Geolocation API wrapper, requests permission once and caches.
- `useWindowMessaging`—iframe postMessage bridge for embedding in Qualtrics and other hosts.

These are provided at the App level via Vue `provide`/`inject` with typed injection keys (`src/composables/injectionKeys.ts`).

Feature-specific composables are colocated with their components:

- `src/components/dashboard/composables/`—`useMaplibre`, `useEChartsTheme`, `useChartData`, `useDashboardResults`, `useDashboardStats`, `useDashboardSubnets`
- `src/components/speedtest/composables/`—`useMeterRenderer` (canvas speed meter with oklch color interpolation)
- `src/components/survey/composables/`—`useGooglePlaces`, `useSurvey`, `useSurveyValidation`, `useSurveyAutoPopulate`
- `src/components/dns/composables/`—`useDNSSpeedtest`
- `src/components/dock/composables/`—`useDockState`, `useDockActionBar`, `useDockTransition`, `useLayerTransition`, `usePopupMutex`

## Backend Architecture

### Hono Routes

The API server (`server/src/index.ts`) mounts Hono route groups under `/api`:

| Route prefix | File | Purpose |
|---|---|---|
| `/api/speedtest` | `speedtest.ts` | LibreSpeed-compatible download/upload/ping endpoints |
| `/api/sessions` | `sessions.ts` | Create/retrieve test sessions |
| `/api/results` | `results.ts` | Submit test results, triggers SSE events |
| `/api/surveys` | `surveys.ts` | Survey response submission |
| `/api/ip` | `ip.ts` | IP geolocation + CIDR entity lookup |
| `/api/admin/subnets` | `subnets.ts` | Subnet CRUD, CSV/Google Sheets import |
| `/api/admin/sync` | `sync.ts` | Google Sheets sync |
| `/api/admin/servers` | `servers.ts` | Admin server management, EC2 deployment |
| `/api/admin` | `admin.ts` | Admin stats, session management, survey funnel, provider breakdown |
| `/api/dashboard` | `dashboard/` | Hex-map, time-series, distributions, summary (split into focused modules) |
| `/api/events` | `events.ts` | SSE streaming (public + admin-authenticated streams) |
| `/api/servers` | `servers.ts` | Public server listing |
| `/api/internal/servers` | `servers.ts` | Heartbeat endpoint for EC2 speedtest instances |

### Middleware Stack

Middleware is applied globally and per-route in `server/src/middleware.ts`:

1. **Request ID**—assigns a unique `X-Request-Id` to each request (or preserves the incoming one).
2. **IP resolution**—extracts client IP from `X-Forwarded-For`, `X-Real-IP`, or `CF-Connecting-IP` headers. Falls back to socket remote address.
3. **CORS**—origin whitelist in production (`ALLOWED_ORIGINS`), permissive in dev.
4. **Security headers**—`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and HSTS in production.
5. **Body limit**—256 KB max request body.
6. **Rate limiting**—in-memory per-IP rate limits with method-based tiers (120/min reads, 30/min writes). The speedtest `/garbage` endpoint has a separate concurrency limiter in `routes/speedtest.ts` (max 5 concurrent streams per IP). Rate limiting is not applied to speedtest routes.
7. **Response caching**—TTL-based caching for public dashboard endpoints (60s for hex-map, 30s for time-series and summary, 120s for distributions).
8. **Admin auth**—Bearer token authentication with timing-safe comparison. Applied to admin, subnet, sync, and admin-server routes.
9. **Session resolution**—resolves `X-Session-Token` header to a session document. Logs a warning on IP mismatch but allows the request through (hard rejection breaks proxied setups).

### Input Validation

All API routes validate input using Zod schemas defined in `server/src/validation/`. The module is organized by domain:

- `primitives.ts`—shared types (date, metric, testType, flow, interval enums)
- `results.ts`, `surveys.ts`, `subnets.ts`, `admin.ts`, `dashboard.ts`, `servers.ts`, `sync.ts`, `ip.ts`—per-route schemas
- `helpers.ts`—`parseBody()`, `parseQuery()`, `isResponse()` utilities

### Logging & Audit

Structured JSON logging via `server/src/logging/`:

- `logger.ts`—JSON-line logger with level filtering (`debug`/`info`/`warn`/`error`)
- `request-id.ts`—request ID middleware
- `audit.ts`—fire-and-forget admin action logging to the `audit_log` MongoDB collection. Records subnet CRUD, imports, server registration, and exports.

### MongoDB Collections

- `test_sessions`—one document per test session (created before test starts, updated on completion)
- `test_results`—individual test result records with speed metrics, IP, geolocation, entity match
- `surveys`—survey response documents (demographics, address, experience questions)
- `subnets`—CIDR subnet entries mapped to NC entities (schools, community colleges, LEAs)
- `speedtest_servers`—registered speedtest servers with last heartbeat timestamp
- `ipinfo_cache`—cached IP geolocation lookups (TTL: 30 days)
- `shodan_cache`—cached Shodan lookups (TTL: 7 days)
- `audit_log`—admin action audit trail (subnet CRUD, imports, server management)
- `sync_metadata`—Google Sheets sync configuration and state

### CIDR Binary Trie

The `server/src/trie/` module implements a binary trie for IPv4 CIDR longest-prefix-match lookups. Each bit of an IPv4 address is a branching decision (0 = left, 1 = right), giving O(32) lookup time. On startup, the server loads all subnets from MongoDB into the trie via `rebuildTrieFromDb()`. The IP route and session creation use the trie to match client IPs to NC entities (school district, community college, etc.).

The `manager.ts` module handles trie lifecycle—rebuilding from the database when subnets are added or modified via the admin interface.

### SSE Event Bus

`server/src/events/bus.ts` provides an in-process event bus. When a new result is submitted, the results route emits an event. The SSE endpoint (`/api/events`) holds open connections and forwards events to subscribed clients. The admin dashboard uses this for real-time result streaming.

## Speed Testing Flow

1. **Session creation**—client POSTs to `/api/sessions` to get a session token.
2. **Server selection**—client probes registered servers by latency, picks the closest. Falls back to the central server.
3. **LibreSpeed worker**—the test runs in a Web Worker (`src/utils/librespeed/`). The worker sends XMLHttpRequests to the selected server's speedtest endpoints:
   - `GET /api/speedtest/garbage`—download test (server sends random bytes)
   - `POST /api/speedtest/empty`—upload test (client sends random bytes)
   - `GET /api/speedtest/getIP`—IP detection + ping measurement
4. **Progress updates**—the worker posts messages back to the main thread with real-time speed/ping/jitter values. The `useSpeedtest` composable exposes these as reactive refs.
5. **Result submission**—on completion, client POSTs results to `/api/results` with the session token. The server stores the result and emits an SSE event.
6. **SSE broadcast**—connected dashboards receive the new result in real time via the `/api/events` SSE endpoint.

## Data Visualization

### ECharts

Apache ECharts 6 through `vue-echarts` for all chart components in `src/components/dashboard/charts/`:

- `TimeSeriesChart.vue`—line/area chart of median speeds over time, with brush selection for date range filtering
- `DistributionChart.vue`—histogram of speed distributions with configurable bin sizes
- `BoxPlotChart.vue`—box-and-whisker plots comparing speed by entity type or provider
- `MetricGaugeCards.vue`—summary gauge cards for current metric values

The `useEChartsTheme` composable generates theme options from our design tokens so charts match the glassmorphic aesthetic.

### MapLibre GL + H3

The map view (`DashboardMap.vue`) renders an H3 hex-binned choropleth using MapLibre GL JS with MapTiler vector tiles as the base layer.

The flow:
1. Backend aggregates results by H3 hex cell at the requested resolution (typically resolution 7, ~5 km hexagons)
2. Frontend receives hex cell IDs and aggregated metric values from `/api/dashboard/hex-map`
3. `h3-js` converts cell IDs to GeoJSON polygon boundaries
4. MapLibre renders the hexagons as a fill layer with color mapped to the selected metric

Clicking a hex cell filters the charts and table to show only results from that geographic area. The `useDashboardFilterStore` Pinia store coordinates selection state across all visualization components.

### Cross-Filtering

The filter store holds:
- Date range (start/end timestamps)
- Selected metric (download, upload, ping, jitter)
- Entity type filter (school, community college, LEA, etc.)
- Geographic bounds (from map viewport or hex selection)
- Text search

All dashboard components subscribe to the filter store. When the user brushes a date range on the time-series chart, the map and table update. When they click a hex on the map, the charts and table filter. The backend public-dashboard endpoints accept all filter parameters and return pre-aggregated results.

## Infrastructure

### Docker

Production runs two containers defined in `server/compose.yaml`:

- `api`—the Hono server, built from `server/Dockerfile` (Node.js 22 Alpine, multi-stage build). Listens on port 3000 internally, mapped to `127.0.0.1:3200` on the host.
- `mongo`—MongoDB 8, with a health check (`mongosh --eval "db.adminCommand('ping')"`). Data persisted in a named volume.

The `Dockerfile.speedtest` builds a lightweight variant that only runs the speedtest endpoints (`speedtest-server.ts`). This is what gets deployed to EC2 instances for distributed testing.

### Apache Reverse Proxy

Apache on the host machine reverse-proxies to the Docker containers. It handles SSL termination via Let's Encrypt certificates, serves the static frontend from `dist/`, and proxies `/api/*` requests to the Hono container on port 3200.

### EC2 Speedtest Servers

The `server/src/infra/ec2-deployer.ts` module provisions lightweight speedtest-only EC2 instances. Each instance:

1. Runs a `t3.micro` (or configured type) in the target AWS region
2. Gets a security group (`speedtest-server-sg`) allowing inbound HTTP (80/443) and SSH (22)
3. Uses a user-data script that installs Docker and runs a lightweight speedtest container
4. Sends heartbeat PUTs to the central API at `/api/internal/servers/{serverId}/heartbeat`
5. Appears in the server selector for users geographically close to that region

### DNS

Route53 manages DNS for the `friday.institute` zone (hosted zone ID `ZVBTLAAD8BV9S`). The production speedtest lives at `speedtest.mbabb.friday.institute`. EC2 speedtest servers get their own A records under this zone.

### SSL

Let's Encrypt certificates are managed by certbot on the production host. Apache's virtual host config references the certificates for TLS termination. Certbot auto-renews via systemd timer.

### Deploy Pipeline

`scripts/deploy.sh` handles the full deploy:

1. Builds the frontend locally (`npm run build` / `vite build --mode production`)
2. Tests SSH connectivity to the deploy host (`mbabb.fridayinstitute.net:1022`, VPN address)
3. Rsyncs server code, built frontend, `.env`, auth credentials, and data files
4. SSHs in and runs `docker compose up -d --build --force-recreate`
5. Waits 5 seconds and checks the health endpoint (`/api/`)
6. Reports the public URL and deploy connection info
