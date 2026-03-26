# Project History

## Adoption and Early Work (2019–2020)

We started this as a fork of [LibreSpeed](https://github.com/librespeed/speedtest), an open-source HTML5 speed test originally written by Federico Dossena. The upstream repo's first commit dates to March 2016; over the next few years it gained Web Workers, multi-stream testing, jitter measurement, and Docker support. Our fork diverged from LibreSpeed's master in early 2020 when we began customizing it for the Friday Institute.

The earliest project-specific commits are from January 2020—styling hacks, URL parameter handling, and the first attempts at embedding in Qualtrics. These early sessions involved figuring out how to make LibreSpeed's UI render inside a Qualtrics survey iframe without CSS collisions.

By June 2020, we stripped out Bootstrap and jQuery, replacing them with a custom `dollar.js` micro-library and the canvas-based speed meter that still exists in a much-evolved form today. The June commits show the progression: fluid text scaling, an animation framework with awaitable keyframes, and a state machine for test flow control.

July 2020 brought ESLint and an initial refactoring pass. Mid-July introduced `dollar.js` with TypeScript support and a restructured file hierarchy. The canvas polygon state objects were refactored shortly after, along with the keyframe animation library which later became its own npm package ([@mkbabb/keyframes.js](https://github.com/mkbabb/keyframes.js)). The animation/draw loop separation came at the end of July, fixing background update errors that had been causing rendering glitches.

## The NC Broadband Survey (2020–2021)

NCDIT's Broadband Infrastructure Office commissioned a speed measurement tool for North Carolina's statewide broadband survey. The survey aimed to collect real-world speed data from residents across the state, alongside their self-reported ISP and experience data.

The [`qualtrics-overrides`](https://github.com/TheFridayInstitute/qualtrics-overrides) repo handles the iframe bridge. We started building postMessage bridges in February 2020 that let the speedtest running inside an iframe communicate results back to the parent Qualtrics survey. The [`speedtest-logging`](https://github.com/TheFridayInstitute/speedtest-logging) repo (July–August 2020) handled the PHP backend for recording test results. The core challenge was making the speed test work reliably across every browser and device a North Carolina resident might use, from modern Chrome to IE11 on old library computers.

The survey launched in July 2020 as a 5-minute questionnaire available in English and Spanish. We embedded the speedtest directly into the Qualtrics survey flow—respondents would answer demographic questions, run the test, then answer experience questions. The postMessage bridge passed download speed, upload speed, ping, and jitter back to Qualtrics as embedded data fields.

The [`survey-post-processing`](https://github.com/TheFridayInstitute/survey-post-processing) repo became the core of our data pipeline. Started June 2020 and maintained through 2024, it ran nightly jobs to geocode survey addresses, transcribe open-ended responses, clean speed measurements, and generate analysis datasets. The [`qualtrics-utils`](https://github.com/TheFridayInstitute/qualtrics-utils) package provided API wrappers for Qualtrics survey export and distribution management. [`qualtrics-ncbio2020`](https://github.com/TheFridayInstitute/qualtrics-ncbio2020) contained the specific survey instruments and configuration for the NCDIT partnership. [`farm-survey-import`](https://github.com/TheFridayInstitute/farm-survey-import) handled a parallel agricultural broadband survey that ran alongside the main effort.

We released the first dashboard results on January 28, 2021. By March 2021, we were modernizing the frontend—moving to npm, adding rollup bundling, and beginning the HTML overhaul.

## The FCC Map Challenge (2022–2023)

The FCC released its National Broadband Map in November 2022, and states had a limited window to challenge the data with evidence. Our survey had produced speed measurements that could contradict ISP-reported coverage. Between June 2022 and May 2023, we submitted 43,000 challenges to the FCC map, identifying over 115,000 additional NC locations that lacked high-speed internet.

The [`address-scraper`](https://github.com/TheFridayInstitute/address-scraper) repo was an intense sprint from December 2022 through January 2023. We built scrapers for T-Mobile, Verizon 5G, CenturyLink, Brightspeed, and Windstream that checked actual service eligibility at specific addresses. The approach: take a known address, hit each provider's availability checker, and record what service (if any) they actually offered at that location. This produced roughly 750,000 records.

CenturyLink's availability API returned detailed speed tier data that directly contradicted their FCC filings at scale. Brightspeed (which had acquired CenturyLink's copper network in parts of NC) showed similar patterns.

## BEAD Funding Impact (2023–present)

The challenge data, combined with the survey results, fed into North Carolina's position in the BEAD (Broadband Equity, Access, and Deployment) allocation process. North Carolina's BEAD allocation exceeded $1.5 billion. Separately, $350 million in GREAT/ARPA broadband grants flowed through the state. In December 2025, over $300 million in additional awards were announced.

No single effort accounts for any of these numbers—the funding formulas are complex, and many organizations contributed challenge data. Our 43,000 challenges and 115,000 identified locations were, by volume, among the largest state-level contributions to the FCC map correction process. Each additional unserved location identified increased NC's allocation weight.

## DNS Speedtest (2024–2025)

In 2024, we started work on DNS-based speed measurement as an alternative to traditional HTTP-based testing. The approach measures connection quality through DNS query performance—latency patterns, packet loss, and resolver behavior.

The [`dns-speedtest`](https://github.com/TheFridayInstitute/dns-speedtest) repo contains the implementation. It uses `dnslib` for DNS packet construction, `scapy` for raw packet manipulation, and PCAP for capture analysis. We send crafted DNS queries with EDNS0 extensions and measure response characteristics. Infrastructure-wise, DNS test servers were deployed on AWS Lambda via Terraform for geographic distribution without managing persistent servers.

## The Modern Rebuild (2024–2026)

The codebase went quiet in 2022–2023 while we focused on the FCC challenge work and the address scrapers. In October 2024, we picked the frontend back up—ipinfo.io integration, rebuilt dist, restructured code.

The major refactor happened in March 2026. On March 23, a batch of commits restructured the frontend:

- Removed dead code and deprecated utilities
- Added a TypeScript type system for speedtest, servers, and DNS
- Split the canvas renderer into sub-modules with oklch color math and timing utilities
- Added composables and server config
- Decomposed `App.vue` into focused components
- Overhauled design tokens, styling, and animations
- Migrated from radix-vue to reka-ui, restyled shadcn component roots
- Updated the app shell, Vite config, and dependencies

The next day brought the backend and feature integration:

- Added the Hono + MongoDB backend, replacing the old PHP backend entirely
- Updated LibreSpeed to v5.4, stripped out all PHP
- Added the JSON-driven survey wizard with two survey flows
- Added the admin results dashboard with IP lookup manager
- Ported the glassmorphic dock from value.js
- Decomposed the meter into focused modules with WebGL glass rendering
- Glassmorphic design system overhaul
- Integrated backend, survey, dock, and background speedtest
- Added `dev.sh` and `deploy.sh` scripts

A second wave of refactoring followed:

- Accent theme colors, halved glass blur, tokenized gold shimmer
- Removed box-shadow from `.glass`, colocated layout styles
- Colocated feature-specific composables
- Added cleanup for `useSpeedtest` and `useGooglePlaces`
- Extracted `useAppNavigation`, fixed viewport containment
- Replaced raw elements with glass-ui components
- Organized speedtest and DNS into feature directories
- Consumed `@mkbabb/glass-ui` as a dependency, removed local component copies

The stack at this point: Vue 3 with vue-router and Pinia for state management. ECharts 6 via `vue-echarts` for analytics (time-series, distribution histograms, box plots). MapLibre GL JS with Uber H3 for hex-binned geographic visualization. Tailwind v4 with the `glass-ui` design system. The backend runs on Hono with MongoDB 8, deployed via Docker Compose. EC2 instances serve as distributed speedtest endpoints with heartbeat registration back to the central API.

## The Ecosystem

The full data flow spans multiple repositories:

```
User takes speed test (this repo)
        │
        ├── Results stored in MongoDB
        │
        ├── Survey answers submitted to Qualtrics
        │       │
        │       └── qualtrics-utils exports responses
        │               │
        │               └── survey-post-processing geocodes + cleans
        │
        ├── Dashboard visualizes aggregated data
        │       ├── H3 hex-binned map (MapLibre GL)
        │       ├── Time-series + distribution charts (ECharts)
        │       └── CIDR trie matches IPs to NC entities
        │
        └── FCC challenge pipeline
                ├── address-scraper checks provider eligibility
                └── Challenge submissions to FCC Broadband Map
```

All repositories live under the [TheFridayInstitute](https://github.com/TheFridayInstitute) GitHub organization:

| Repository | Purpose | Active Period |
|---|---|---|
| [`speedtest`](https://github.com/TheFridayInstitute/speedtest) | This repo—speed test + dashboard + backend | 2020–present |
| [`survey-post-processing`](https://github.com/TheFridayInstitute/survey-post-processing) | Nightly geocoding + transcription pipeline | 2020–2024 |
| [`address-scraper`](https://github.com/TheFridayInstitute/address-scraper) | Telecom provider eligibility scraping | Dec 2022–Jan 2023 |
| [`dns-speedtest`](https://github.com/TheFridayInstitute/dns-speedtest) | DNS-based speed measurement | 2024–2025 |
| [`qualtrics-overrides`](https://github.com/TheFridayInstitute/qualtrics-overrides) | Speedtest embedding in Qualtrics surveys | 2020–2021 |
| [`qualtrics-utils`](https://github.com/TheFridayInstitute/qualtrics-utils) | Qualtrics API export/sync utilities | 2020–2023 |
| [`qualtrics-ncbio2020`](https://github.com/TheFridayInstitute/qualtrics-ncbio2020) | NCDIT survey instruments | 2020–2021 |
| [`farm-survey-import`](https://github.com/TheFridayInstitute/farm-survey-import) | Agricultural broadband survey import | 2020–2021 |
| [`speedtest-logging`](https://github.com/TheFridayInstitute/speedtest-logging) | PHP logging backend (deprecated) | 2020 |
