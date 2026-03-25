# Project History

## Adoption and Early Work (2019--2020)

This project started as a fork of [LibreSpeed](https://github.com/librespeed/speedtest), an open-source HTML5 speed test originally written by Federico Dossena. The upstream repo's first commit (`bec767c`) dates to March 2016; over the next few years it gained Web Workers, multi-stream testing, jitter measurement, and Docker support. The fork diverged from LibreSpeed's master in early 2020 when development began customizing it for the Friday Institute.

The earliest project-specific commits in the repo are from January 2020---styling hacks, URL parameter handling, and the first attempts at embedding in Qualtrics (`87f68dc`, January 10, 2020: "CSS3 is apparently incompatible with Qualtrics?"). These early sessions involved figuring out how to make LibreSpeed's UI render inside a Qualtrics survey iframe without CSS collisions.

By June 2020, Bootstrap and jQuery were stripped out (`d2e49cb`, June 12), replaced with a custom `dollar.js` micro-library (`6ead00a`, July 14), The canvas-based speed meter that still exists in a much-evolved form today. The June commits show the progression: fluid text scaling (`290994f`, June 10), animation framework with awaitable keyframes (`b1cbfe6`, June 14), and a state machine for test flow control (`a9d7886`, June 12).

July 7, 2020 brought ESLint and an initial refactoring pass (`4c0ba60`). July 14 introduced `dollar.js` with TypeScript support and a restructured file hierarchy (`6ead00a`). By July 15, the canvas polygon state objects were being refactored (`c427dd7`) and along with the keyframe animation library (`10947ed`, July 18) which later became its own npm package (`@mkbabb/keyframes.js`). The animation/draw loop separation came July 31 (`e2dc42b`), fixing background update errors that had been causing rendering glitches.

## The NC Broadband Survey (2020--2021)

NCDIT's Broadband Infrastructure Office commissioned a speed measurement tool for North Carolina's statewide broadband survey. The survey aimed to collect real-world speed data from residents across the state, rather than relying on ISP Form 477 filings that consistently overstated coverage.

The `qualtrics-overrides` repo handles the iframe bridge---Development started in February 2020, building postMessage bridges that let the speedtest running inside an iframe communicate results back to the parent Qualtrics survey. The `speedtest-logging` repo (July--August 2020) handled the PHP backend for recording test results. The core challenge was making the speed test work reliably across every browser and device that a North Carolina resident might use, from modern Chrome to IE11 on old library computers.

The survey launched in July 2020 as a 5-minute questionnaire available in English and Spanish. The test was embedded the speedtest directly into the Qualtrics survey flow---respondents would answer demographic questions, run the test, then answer experience questions. The `postMessage` bridge (`b047d8d`, July 16, 2020) passed download speed, upload speed, ping, and jitter back to Qualtrics as embedded data fields.

The `survey-post-processing` repo became the backbone of the data pipeline. Started June 2020 and maintained through 2024. It ran nightly jobs to geocode survey addresses, transcribe open-ended responses, clean speed measurements, and generate the analysis datasets. The `qualtrics-utils` package provided API wrappers for Qualtrics survey export and distribution management. `qualtrics-ncbio2020` contained the specific survey instruments and configuration for the NCDIT partnership. `farm-survey-import` handled a parallel agricultural broadband survey that ran alongside the main effort.

The dashboard results were released January 28, 2021. By March 2021, the frontend was being modernized---moving to npm (`c84493a`, March 22, 2021), adding rollup bundling (`8ea9874`, March 22), and beginning the HTML overhaul (`0b34578`, March 25).

## The FCC Map Challenge (2022--2023)

The FCC released its National Broadband Map in November 2022, and states had a limited window to challenge the data with evidence. The survey had produced ground-truth speed measurements that could contradict ISP-reported coverage. Between June 2022 and May 2023, 43,000 challenges were submitted to the FCC map, identifying over 115,000 additional NC locations that lacked high-speed internet---more challenges than any other state.

The `address-scraper` repo was an intensive sprint from December 2022 through January 2023. Scrapers were built for T-Mobile, Verizon 5G, CenturyLink, Brightspeed, and Windstream that checked actual service eligibility at specific addresses. The approach was to take a known address, hit each provider's availability checker, and record what service (if any) they actually offered at that location. This produced roughly 750,000 records.

CenturyLink was the breakthrough---their availability API returned detailed speed tier data that directly contradicted their FCC filings at scale. Brightspeed (which had acquired CenturyLink's copper network in parts of NC) showed similar patterns. The gap between what providers reported to the FCC and what they actually offered to customers was often substantial.

## BEAD Funding Impact (2023--present)

The challenge data, combined with the survey results, directly shaped North Carolina's position in the BEAD (Broadband Equity, Access, and Deployment) allocation process. North Carolina's BEAD allocation exceeded $1.5 billion. Separately, $350 million in GREAT/ARPA broadband grants flowed through the state. In December 2025, over $300 million in additional awards were announced.

No single effort can claim sole credit for any of these numbers---the funding formulas are complex, and many organizations contributed challenge data. The 43,000 challenges and 115,000 identified locations were, by volume, the largest state-level contribution to correcting the FCC map. Every additional unserved location were identified increased NC's allocation weight.

## DNS Speedtest (2024--2025)

In 2024, work began on DNS-based speed measurement as an alternative to traditional HTTP-based testing. The approach measures connection quality through DNS query performance---latency patterns, packet loss, and resolver behavior can reveal a lot about a user's last-mile connection without requiring a full speed test.

The `dns-speedtest` repo contains the implementation. The implementation uses `dnslib` for DNS packet construction, `scapy` for raw packet manipulation, and PCAP for capture analysis. The system sends crafted DNS queries with EDNS0 extensions and measures response characteristics. Infrastructure-wise, DNS test servers were deployed on AWS Lambda via Terraform, giving us geographic distribution without managing persistent servers.

The work from late October through November 2024 shows the progression in this repo: the initial PCAP functions (`656d77f`, November 12, 2024), byte amount tuning (`0eeae56`, October 28), and various path and build fixes through iterative refinement.

## The Modern Rebuild (2024--2026)

The codebase went through a quiet period in 2022--2023 during focus on the FCC challenge work and the address scrapers. In October 2024, modernization of the frontend again---the October 10--11 commits (`69bc01d` through `79bf359`) added ipinfo.io integration, rebuilt the dist, and started restructuring the code.

The real transformation happened in March 2026. On March 23, a batch of commits fundamentally restructured the frontend:

- `ea5b311` --- removed dead code and deprecated utilities
- `a74ac12` --- added a proper TypeScript type system for speedtest, servers, and DNS
- `321becd` --- split the canvas renderer into sub-modules with oklch color math and timing utilities
- `cd70aa6` --- added composables and server config
- `c4203de` --- decomposed the monolithic `App.vue` into focused components
- `0811f2e` --- overhauled design tokens, styling, and animations
- `dbfce73` --- migrated from radix-vue to reka-ui, restyled shadcn component roots
- `faf509b` --- updated `App.vue` shell, Vite config, and dependencies

The next day, March 24, brought the backend and feature integration:

- `4adcd16` --- added the Hono + MongoDB backend (replacing the old PHP backend entirely)
- `564773a` --- updated LibreSpeed to v5.4, stripped out all PHP
- `083d6a3` --- added the JSON-driven survey wizard with two survey flows
- `f690cd7` --- added the admin results dashboard with IP lookup manager
- `157ed1e` --- ported the glassmorphic dock from value.js
- `d750dc9` --- decomposed the meter into focused modules with WebGL glass rendering
- `99aae07` --- glassmorphic design system overhaul
- `0f72597` --- integrated backend, survey, dock, and background speedtest
- `9979cf1` --- added `dev.sh` and `deploy.sh` scripts

A second wave of refactoring commits followed later on March 24:

- `457edb4` --- accent theme colors, halved glass blur, tokenized gold shimmer
- `b160c92` --- removed box-shadow from `.glass`, colocated layout styles
- `d0c4ccc` --- colocated feature-specific composables
- `cb507f8` --- added cleanup for `useSpeedtest` and `useGooglePlaces`
- `dc66623` --- extracted `useAppNavigation`, fixed viewport containment
- `371ea15` --- replaced raw elements with glass-ui components
- `76480ab` --- organized speedtest and DNS into feature directories
- `346a773` --- consumed `@mkbabb/glass-ui` as a dependency, removed local component copies

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
| `speedtest` | This repo---speed test + dashboard + backend | 2020--present |
| `survey-post-processing` | Nightly geocoding + transcription pipeline | June 2020--2024 |
| `address-scraper` | Telecom provider eligibility scraping | Dec 2022--Jan 2023 |
| `dns-speedtest` | DNS-based speed measurement | 2024--2025 |
| `qualtrics-overrides` | Speedtest embedding in Qualtrics surveys | Feb 2020--2021 |
| `qualtrics-utils` | Qualtrics API export/sync utilities | 2020--2023 |
| `qualtrics-ncbio2020` | NCDIT survey instruments | 2020--2021 |
| `farm-survey-import` | Agricultural broadband survey import | 2020--2021 |
| `speedtest-logging` | PHP logging backend (deprecated) | July--Aug 2020 |
