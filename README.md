# `speedtest` <img src="src/assets/favicon.png" style="vertical-align: middle" width="48">

Broadband speed measurement and analytics platform built on [LibreSpeed](https://github.com/librespeed/speedtest). Vue 3 dashboard, H3 hex-binned mapping, Hono/MongoDB backend.

[demo](https://speedtest.mbabb.friday.institute)

## Background

We built this at the Friday Institute's Technology Infrastructure Lab at NC State, in partnership with NCDIT's Broadband Infrastructure Office, as a speed measurement tool for North Carolina's broadband survey—a statewide effort to map internet performance from residents rather than ISP-reported coverage.

The survey launched during COVID, in July 2020, as a 5-minute questionnaire with an integrated speedtest embedded directly into a Qualtrics survey via iframe postMessage bridges to capture download/upload speeds alongside qualitative responses. The first dashboard results were released January 28, 2021. That data continues to be used for broadband advocacy, policy, and research across the state.

In 2022, the FCC launched the BEAD program, allocating billions in federal funding for broadband expansion based on a challenge process to identify unserved locations. We adapted the speedtest platform to support the FCC's challenge requirements, including multi-server testing and latency-based server selection.

## Features

-   [LibreSpeed](https://github.com/librespeed/speedtest)-based speed testing (download, upload, ping, jitter)
-   Multi-step survey wizard with Google Places address lookup
-   [H3](https://h3geo.org) hex-binned geographic visualization via [MapLibre GL](https://maplibre.org)
-   [ECharts](https://echarts.apache.org) time-series, distribution, and box-plot analytics
-   Cross-filtering between map, charts, and data views
-   Multi-server architecture with auto-selection by latency
-   Server-Sent Events for real-time dashboard updates
-   CIDR binary trie for IP-to-entity lookup (NC schools, community colleges, LEAs)
-   CSV and Google Sheets subnet import
-   EC2 speedtest server deployment

## Stack

| Layer          | Technology                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend       | [Vue 3](https://vuejs.org), TypeScript, [Tailwind v4](https://tailwindcss.com), [@mkbabb/glass-ui](https://github.com/mkbabb/glass-ui)               |
| Charts         | [Apache ECharts 6](https://echarts.apache.org) via [vue-echarts](https://github.com/ecomfe/vue-echarts)                                              |
| Maps           | [MapLibre GL JS](https://maplibre.org), [Uber H3](https://h3geo.org)                                                                                |
| Animation      | [@mkbabb/keyframes.js](https://github.com/mkbabb/keyframes.js)                                                                                       |
| Backend        | [Hono](https://hono.dev), [MongoDB 8](https://www.mongodb.com), Node.js 22                                                                           |
| Deploy         | Docker Compose, Apache, Let's Encrypt                                                                                                                 |
| Infrastructure | AWS EC2, Route53                                                                                                                                      |

## Getting Started

```bash
# Start local dev environment (MongoDB + Hono backend + Vite frontend)
./scripts/dev.sh
```

Server environment variables (in `server/.env`, see `server/.env.example`):

-   `MONGODB_URI`—MongoDB connection string
-   `ADMIN_TOKEN`—admin dashboard auth token
-   `IPINFO_TOKEN`—ipinfo.io API key (optional)
-   `SHODAN_KEY`—Shodan API key (optional)
-   `ALLOWED_ORIGINS`—comma-separated CORS origins
-   `GOOGLE_SERVICE_ACCOUNT_KEY`—path to Google service account JSON for Sheets sync (optional)

Frontend env (in `.env`):

-   `VITE_MAPTILER_KEY`—MapTiler API key for vector map tiles
-   `VITE_GOOGLE_MAPS_KEY`—Google Maps API key for Places autocomplete

> Note: the Vite dev server proxies `/api` to the target set by `VITE_API_TARGET`. This defaults to the production URL. To proxy to your local backend instead: `VITE_API_TARGET=http://localhost:3200 ./scripts/dev.sh`

## Deploy

```bash
# Build frontend + deploy via SSH to production
./scripts/deploy.sh
```

Production is at `speedtest.mbabb.friday.institute`. The deploy script SSHs via the VPN address (`mbabb.fridayinstitute.net:1022`), syncs code via rsync, and rebuilds the Docker containers.

## Project Structure

```
src/
├── @/components/ui/       # shadcn/reka-ui component primitives
├── components/
│   ├── speedtest/         # Speed test meter, results, mini-meter
│   ├── dns/               # DNS-based speed testing
│   ├── dashboard/         # Charts, map, filters, stats
│   │   ├── charts/        # ECharts (time-series, distribution, box-plot)
│   │   └── composables/   # Map, chart data, filter data fetching
│   ├── admin/             # Session table, server manager, subnet admin
│   ├── survey/            # Multi-step survey wizard
│   │   └── composables/   # Google Places, validation, auto-populate
│   └── dock/              # Dock control bar
│       └── composables/   # Dock state, transitions, popup mutex
├── composables/           # Shared: API client, speedtest, server manager, IP info, etc.
├── stores/                # Pinia stores (filters, dashboard data)
├── layouts/               # Admin + public dashboard layouts
├── views/                 # Route view components
├── router/                # Vue Router config
├── config/                # Server config, survey config
├── types/                 # TypeScript type definitions
└── utils/                 # LibreSpeed worker, math, timing, DOM utilities

server/
├── src/
│   ├── routes/
│   │   ├── speedtest.ts        # LibreSpeed-compatible endpoints
│   │   ├── sessions.ts         # Test session management
│   │   ├── results.ts          # Result submission + SSE broadcast
│   │   ├── surveys.ts          # Survey submission
│   │   ├── admin.ts            # Admin dashboard API
│   │   ├── dashboard/          # Public analytics (hex-map, time-series, distributions, summary)
│   │   ├── servers.ts          # Server registry, heartbeat, admin CRUD
│   │   ├── ip.ts               # IP geolocation + CIDR entity lookup
│   │   ├── subnets.ts          # Subnet CRUD, CSV/Sheets import
│   │   ├── sync.ts             # Google Sheets sync
│   │   └── events.ts           # SSE streaming
│   ├── trie/                   # CIDR binary trie for IP entity lookup
│   ├── events/                 # In-process event bus
│   ├── logging/                # JSON logger, audit trail, request IDs
│   ├── validation/             # Zod input schemas
│   ├── sync/                   # Google Sheets integration
│   ├── infra/                  # EC2 deployer
│   ├── seed.ts                 # Subnet CSV import
│   └── middleware.ts           # CORS, rate limiting, auth, caching
├── data/                       # Seed CSV data
├── Dockerfile                  # Production API container
├── Dockerfile.speedtest        # Lightweight speedtest-only container
└── compose.yaml                # Docker Compose (API + MongoDB)

styles/
├── style.css              # Tailwind v4 entry + @theme extensions
├── tokens.css             # Design tokens (colors, fonts, shadows)
├── animations.css         # Keyframe animations
├── glass.css              # Glass-ui overrides
└── dock.css               # Dock overrides
```

## History

See [docs/HISTORY.md](docs/HISTORY.md) for the full project history, from the initial LibreSpeed adoption through the FCC map challenge and the modern Vue 3 rebuild.

## Related Projects

### Upstream

-   [LibreSpeed](https://github.com/librespeed/speedtest)—the open-source HTML5 speed test we forked from

### Our Libraries

-   [@mkbabb/glass-ui](https://github.com/mkbabb/glass-ui)—glassmorphic Vue component library
-   [@mkbabb/keyframes.js](https://github.com/mkbabb/keyframes.js)—animation keyframe engine, born from this project's canvas work

### Friday Institute Ecosystem

-   [`survey-post-processing`](https://github.com/TheFridayInstitute/survey-post-processing)—nightly geocoding + transcription pipeline
-   [`address-scraper`](https://github.com/TheFridayInstitute/address-scraper)—telecom provider eligibility scraping
-   [`dns-speedtest`](https://github.com/TheFridayInstitute/dns-speedtest)—DNS-based speed measurement
-   [`qualtrics-overrides`](https://github.com/TheFridayInstitute/qualtrics-overrides)—speedtest embedding in Qualtrics surveys
-   [`qualtrics-utils`](https://github.com/TheFridayInstitute/qualtrics-utils)—Qualtrics API export/sync utilities
-   [`qualtrics-ncbio2020`](https://github.com/TheFridayInstitute/qualtrics-ncbio2020)—NCDIT survey instruments (archived)
-   [`farm-survey-import`](https://github.com/TheFridayInstitute/farm-survey-import)—agricultural broadband survey import (archived)
-   [`speedtest-logging`](https://github.com/TheFridayInstitute/speedtest-logging)—PHP logging backend (deprecated)
