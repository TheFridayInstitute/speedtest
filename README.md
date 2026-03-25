# speedtest

Broadband speed measurement and analytics platform built for North Carolina's statewide broadband survey. Integrates LibreSpeed for speed testing with a Vue 3 dashboard, H3 hex-binned mapping, and a Hono/MongoDB backend.

Deployed at [speedtest.mbabb.friday.institute](https://speedtest.mbabb.friday.institute)

## Background

Built at the Friday Institute's Technology Infrastructure Lab at NC State, in partnership with NCDIT's Broadband Infrastructure Office. The goal: a speed measurement tool for North Carolina's broadband survey—a statewide effort to map actual internet performance rather than relying on ISP-reported coverage data.

The survey launched in July 2020 as a 5-minute questionnaire in English and Spanish with an integrated speedtest, embedded directly into Qualtrics surveys via iframe postMessage bridges to capture download/upload speeds alongside qualitative responses. Dashboard results were released January 28, 2021.

Between June 2022 and May 2023, nearly 43,000 challenges were submitted to the FCC's National Broadband Map, identifying 115,000+ additional NC locations without high-speed internet—more than any other state. Parallel address scrapers checked actual service eligibility from T-Mobile, Verizon 5G, CenturyLink, Brightspeed, and Windstream (~750k records total). This data contributed directly to North Carolina's BEAD allocation exceeding $1.5 billion.

## Features

- LibreSpeed-based speed testing (download, upload, ping, jitter)
- Multi-step survey wizard with Google Places address lookup
- H3 hex-binned geographic visualization via MapLibre GL
- ECharts time-series, distribution, and box-plot analytics
- Tableau-style cross-filtering between map, charts, and data views
- Multi-server architecture with auto-selection by latency
- Real-time updates via Server-Sent Events
- CIDR-based entity lookup (562 NC schools, community colleges, LEAs)
- CSV and Google Sheets subnet import
- EC2 speedtest server deployment

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, TypeScript, Tailwind v4, [glass-ui](https://github.com/mkbabb/glass-ui) |
| Charts | Apache ECharts 6 via vue-echarts |
| Maps | MapLibre GL JS, Uber H3 |
| Backend | Hono, MongoDB 8, Node.js 22 |
| Deploy | Docker Compose, Apache, Let's Encrypt |
| Infrastructure | AWS EC2, Route53, S3 |

## Getting Started

```bash
# Start local dev environment (MongoDB + Hono backend + Vite frontend)
./scripts/dev.sh
```

Environment variables (in `server/.env`):
- `MONGODB_URI` --- MongoDB connection string
- `ADMIN_TOKEN` --- admin dashboard auth token
- `IPINFO_TOKEN` --- ipinfo.io API key
- `SHODAN_KEY` --- Shodan API key (optional)

Frontend env (in `.env`):
- `VITE_MAPTILER_KEY` --- MapTiler API key for vector map tiles

## Deploy

```bash
# Build frontend + deploy via SSH to production
./scripts/deploy.sh
```

Production is at `speedtest.mbabb.friday.institute`. The deploy script SSHs via the VPN address (`mbabb.fridayinstitute.net:1022`), syncs code via rsync, and rebuilds the Docker containers.

## Project Structure

```
src/
├── components/
│   ├── speedtest/          # Speed test meter, results, start pane
│   ├── dns/                # DNS-based speed testing
│   ├── dashboard/          # Charts, map, filters, stats cards
│   │   ├── charts/         # ECharts components (time-series, distribution, box-plot)
│   │   └── composables/    # Dashboard data fetching
│   ├── admin/              # Session table, server manager
│   ├── survey/             # Multi-step survey wizard
│   └── dock/               # Glassmorphic dock control bar
├── composables/            # Shared composables (speedtest, maplibre, SSE, etc.)
├── stores/                 # Pinia stores (filters, dashboard data)
├── layouts/                # Admin + public dashboard layouts
├── views/                  # Route view components
├── router/                 # Vue Router config
├── config/                 # Server config, survey config
├── types/                  # TypeScript type definitions
└── utils/                  # Canvas rendering, color math, auth

server/
├── src/
│   ├── routes/             # Hono route handlers
│   │   ├── speedtest.ts    # LibreSpeed-compatible endpoints
│   │   ├── sessions.ts     # Test session management
│   │   ├── results.ts      # Result submission + SSE events
│   │   ├── surveys.ts      # Survey submission
│   │   ├── admin.ts        # Admin dashboard API
│   │   ├── public-dashboard.ts  # Public analytics API (hex-map, time-series, distributions)
│   │   ├── servers.ts      # Server registry + heartbeat
│   │   └── events.ts       # SSE streaming
│   ├── trie/               # CIDR binary trie for IP entity lookup
│   ├── events/             # In-process event bus
│   ├── infra/              # EC2 deployer
│   └── middleware.ts       # CORS, rate limiting, auth, response caching
├── Dockerfile              # Production API container
├── Dockerfile.speedtest    # Lightweight speedtest-only container
└── compose.yaml            # Docker Compose (API + MongoDB)

styles/
├── style.css               # Tailwind v4 entry + @theme extensions
├── tokens.css              # Design tokens (colors, fonts, shadows)
├── glass.css               # Glass-ui overrides
└── dock.css                # Dock overrides
```

## History

See [docs/HISTORY.md](docs/HISTORY.md) for the full project history, from the initial LibreSpeed adoption through the FCC map challenge and the modern Vue 3 rebuild.

## Related Repositories

- [`survey-post-processing`](https://github.com/TheFridayInstitute/survey-post-processing) --- nightly geocoding + transcription pipeline
- [`address-scraper`](https://github.com/TheFridayInstitute/address-scraper) --- telecom provider eligibility scraping
- [`dns-speedtest`](https://github.com/TheFridayInstitute/dns-speedtest) --- DNS-based speed measurement
- [`qualtrics-overrides`](https://github.com/TheFridayInstitute/qualtrics-overrides) --- speedtest embedding in Qualtrics surveys
- [`qualtrics-utils`](https://github.com/TheFridayInstitute/qualtrics-utils) --- Qualtrics API export/sync utilities

## License

ISC
