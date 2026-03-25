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

The frontend is a single-page app built with Vue 3's Composition API. The frontend uses `vue-router` for client-side routing and Pinia for shared state.

**Routes** (`src/router/index.ts`):

- `/` --- speedtest view (test execution)
- `/survey` --- multi-step survey wizard
- `/thankyou` --- post-survey thank you
- `/dashboard/map` --- public hex-binned map
- `/dashboard/charts` --- public analytics charts
- `/admin/overview` --- admin summary stats
- `/admin/data` --- admin results table with filters
- `/admin/charts` --- admin analytics
- `/admin/map` --- admin map view
- `/admin/settings` --- server management, subnet import

**Layouts** separate the chrome from the content. `AdminDashboardLayout.vue` provides the admin nav tabs; `PublicDashboardLayout.vue` provides the public-facing dashboard shell.

**Pinia stores** (`src/stores/`):

- `useDashboardFilterStore` --- cross-filtering state shared between map, charts, and table. Holds date range, metric selection, entity filters, and geographic bounds. Any component can read/write filters, and all visualization components react.
- `useAdminDashboardDataStore` --- admin data fetching, pagination, and aggregation.
- `usePublicDashboardDataStore` --- public dashboard data with cached responses.

### Glass-UI and Tailwind v4

The design system is built on the `glass-ui` library (`@mkbabb/glass-ui`), consumed as a local file dependency. Glass-ui provides glassmorphic component primitives---backdrop-blur panels, frosted overlays, shimmer effects. Composed with its CSS utility classes rather than reimplementing glass effects.

Tailwind v4 handles utility styling. The entry point is `styles/style.css` which imports Tailwind and extends `@theme` with our design tokens. `styles/tokens.css` defines the color palette, font stack, shadow system, and spacing scale. `styles/glass.css` contains glass-ui overrides specific to this project, and `styles/dock.css` styles the macOS-style dock component.

### Composables

Shared logic lives in `src/composables/`. The key ones:

- `useSpeedtest` --- wraps the LibreSpeed worker, manages test lifecycle (idle/running/complete), exposes reactive download/upload/ping/jitter values. Handles cleanup on unmount.
- `useMaplibre` --- initializes MapLibre GL maps with our tile sources, manages layers and event handlers.
- `useSSE` --- Server-Sent Events client for real-time result updates in the dashboard.
- `useEChartsTheme` --- generates ECharts theme options from our design tokens.
- `useGooglePlaces` --- Google Places Autocomplete integration for address input in the survey wizard.
- `useIPInfo` --- ipinfo.io lookups for client IP geolocation.
- `useServerManager` --- multi-server selection, latency probing, heartbeat monitoring.
- `useMeterRenderer` --- canvas-based speed meter with oklch color interpolation and requestAnimationFrame rendering.
- `useAppNavigation` --- tab navigation state between speedtest, survey, and dashboard views.

Feature-specific composables are colocated with their components (e.g., `src/components/dashboard/composables/`, `src/components/dns/composables/`, `src/components/survey/composables/`).

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
| `/api/admin` | `admin.ts` | Admin stats, session management |
| `/api/dashboard` | `public-dashboard.ts` | Hex-map, time-series, distributions, summary |
| `/api/events` | `events.ts` | SSE streaming |
| `/api/servers` | `servers.ts` | Server registry, heartbeat |

### Middleware Stack

Middleware is applied globally and per-route in `server/src/middleware.ts`:

1. **IP resolution** --- extracts client IP from `X-Forwarded-For`, `X-Real-IP`, or `CF-Connecting-IP` headers. Falls back to socket remote address.
2. **CORS** --- origin whitelist in production, permissive in dev.
3. **Body limit** --- 256 KB max request body.
4. **Rate limiting** --- in-memory per-IP rate limits with method-based tiers. Skipped for speedtest routes (they need high throughput).
5. **Response caching** --- TTL-based caching for public dashboard endpoints (60s for hex-map, 30s for time-series, 120s for distributions).
6. **Session resolution** --- resolves `X-Session-Token` header to a session document.

### MongoDB Collections

- `sessions` --- one document per test session (created before test starts, updated on completion)
- `results` --- individual test result records with speed metrics, IP, geolocation, entity match
- `surveys` --- survey response documents (demographics, address, experience questions)
- `subnets` --- CIDR subnet entries mapped to NC entities (schools, community colleges, LEAs)
- `servers` --- registered speedtest servers with last heartbeat timestamp

### CIDR Binary Trie

The `server/src/trie/` module implements a binary trie for IPv4 CIDR longest-prefix-match lookups. Each bit of an IPv4 address is a branching decision (0 = left, 1 = right), giving O(32) lookup time. On startup, the server loads all subnets from MongoDB into the trie via `rebuildTrieFromDb()`. When a result comes in, the client IP is looked up against the trie to match it to an NC entity (school district, community college, etc.).

The `manager.ts` module handles trie lifecycle---rebuilding from the database when subnets are added or modified via the admin interface.

### SSE Event Bus

`server/src/events/bus.ts` provides an in-process event bus. When a new result is submitted, the results route emits an event. The SSE endpoint (`/api/events`) holds open connections and forwards events to subscribed clients. The admin dashboard uses this for real-time result streaming.

## Speed Testing Flow

1. **Session creation** --- client POSTs to `/api/sessions` to get a session token.
2. **Server selection** --- client probes registered servers by latency, picks the closest. Falls back to the central server.
3. **LibreSpeed worker** --- the test runs in a Web Worker (`src/utils/librespeed/`). The worker sends XMLHttpRequests to the selected server's speedtest endpoints:
   - `GET /api/speedtest/garbage` --- download test (server sends random bytes)
   - `POST /api/speedtest/empty` --- upload test (client sends random bytes)
   - `GET /api/speedtest/getIP` --- IP detection + ping measurement
4. **Progress updates** --- the worker posts messages back to the main thread with real-time speed/ping/jitter values. The `useSpeedtest` composable exposes these as reactive refs.
5. **Result submission** --- on completion, client POSTs results to `/api/results` with the session token. Server performs CIDR entity lookup on the client IP and stores the enriched result.
6. **SSE broadcast** --- the result submission triggers an SSE event so admin dashboards update in real time.

## Data Visualization

### ECharts

Apache ECharts 6 through `vue-echarts` for all chart components in `src/components/dashboard/charts/`:

- `TimeSeriesChart.vue` --- line/area chart of median speeds over time, with brush selection for date range filtering
- `DistributionChart.vue` --- histogram of speed distributions with configurable bin sizes
- `BoxPlotChart.vue` --- box-and-whisker plots comparing speed by entity type or provider
- `MetricGaugeCards.vue` --- summary gauge cards for current metric values

The `useEChartsTheme` composable generates theme options from our design tokens so charts match the glassmorphic aesthetic.

### MapLibre GL + H3

The map view (`DashboardMap.vue`) renders an H3 hex-binned choropleth using MapLibre GL JS with MapTiler vector tiles as the base layer.

The flow:
1. Backend aggregates results by H3 hex cell at the requested resolution (typically resolution 7, ~5 km hexagons)
2. Frontend receives hex cell IDs and aggregated metric values from `/api/dashboard/hex-map`
3. `h3-js` converts cell IDs to GeoJSON polygon boundaries
4. MapLibre renders the hexagons as a fill layer with color mapped to the selected metric

Clicking a hex cell filters the charts and table to show only results from that geographic area. This is the Tableau-style cross-filtering---the `useDashboardFilterStore` Pinia store coordinates selection state across all visualization components.

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

- `api` --- the Hono server, built from `server/Dockerfile` (Node.js 22 Alpine, multi-stage build). Listens on port 3000 internally, mapped to `127.0.0.1:3200` on the host.
- `mongo` --- MongoDB 8, with a health check (`mongosh --eval "db.adminCommand('ping')"`). Data persisted in a named volume.

The `Dockerfile.speedtest` builds a lightweight variant that only runs the speedtest endpoints (`speedtest-server.ts`). This is what gets deployed to EC2 instances for distributed testing.

### Apache Reverse Proxy

Apache on the host machine reverse-proxies to the Docker containers. It handles SSL termination via Let's Encrypt certificates, serves the static frontend from `dist/`, and proxies `/api/*` requests to the Hono container on port 3200.

### EC2 Speedtest Servers

The `server/src/infra/ec2-deployer.ts` module provisions lightweight speedtest-only EC2 instances. Each instance:

1. Runs a `t3.micro` (or configured type) in the target AWS region
2. Gets a security group allowing inbound HTTP (port 80/443) and SSH (port 22)
3. Runs the `Dockerfile.speedtest` container
4. Sends heartbeat pings to the central API at `/api/internal/servers`
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
