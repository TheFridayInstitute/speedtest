# Deployment

## Prerequisites

- Node.js 22+
- MongoDB 8 (local for dev, Docker for production)
- Docker and Docker Compose (production)
- SSH access to the deploy host via VPN
- AWS credentials (for EC2 speedtest server provisioning)

## Local Development

The `scripts/dev.sh` script starts the full local stack:

```bash
./scripts/dev.sh
```

This starts three processes:

1. **MongoDB**—local `mongod` on port 27018 (or next available), data in `/tmp/speedtest-mongo-data`
2. **Backend**—Hono API via `tsx watch` on port 3200 (or next available), connected to the local MongoDB
3. **Frontend**—Vite dev server on port 8080 (or next available)

> Note: the Vite dev server proxies `/api` to the target set by `VITE_API_TARGET`. This defaults to the production URL (`https://speedtest.mbabb.friday.institute`), so you see real data without a local backend. To proxy to your local backend: `VITE_API_TARGET=http://localhost:3200 ./scripts/dev.sh`

The script auto-finds free ports if the defaults are taken. Override with environment variables:

```bash
FRONTEND_PORT=9000 BACKEND_PORT=3300 MONGO_PORT=27020 ./scripts/dev.sh
```

All three processes run in the foreground. Ctrl-C shuts everything down via the trap handler.

### Backend-only development

If you only need the API server:

```bash
cd server
export MONGODB_URI="mongodb://localhost:27017/speedtest-db"
npx tsx watch src/index.ts
```

The server starts without MongoDB if it isn't available—speedtest endpoints work, but survey/results/IP lookup routes require the database.

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes (prod) | MongoDB connection string. Default: `mongodb://localhost:27017/speedtest-db` |
| `ADMIN_TOKEN` | Yes (prod) | Bearer token for admin API endpoints |
| `IPINFO_TOKEN` | No | ipinfo.io API key for IP geolocation enrichment |
| `SHODAN_KEY` | No | Shodan API key for network intelligence lookups |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | No | Path to Google service account JSON (for Sheets sync) |
| `ALLOWED_ORIGINS` | Yes (prod) | Comma-separated allowed CORS origins. Empty in production rejects all cross-origin requests. |
| `SERVER_SECRET` | No | Shared secret for speedtest server heartbeat authentication |
| `LOG_LEVEL` | No | Minimum log level: `debug`, `info` (default in prod), `warn`, `error` |
| `PORT` | No | API listen port. Default: `3200` (dev), `3000` (Docker) |
| `NODE_ENV` | No | `production` or `development` |

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_MAPTILER_KEY` | Yes (for maps) | MapTiler API key for vector tile basemaps |
| `VITE_GOOGLE_MAPS_KEY` | Yes (for survey) | Google Maps API key for Places autocomplete |
| `VITE_API_TARGET` | No | Override the Vite dev proxy target. Default: `https://speedtest.mbabb.friday.institute` |

### Docker Compose (`server/compose.yaml`)

The compose file passes `ADMIN_TOKEN`, `ALLOWED_ORIGINS`, `IPINFO_TOKEN`, and `SHODAN_KEY` from the shell environment or `server/.env`. It also hardcodes `MONGODB_URI` (pointing to the `mongo` service), `GOOGLE_SERVICE_ACCOUNT_KEY` (`/app/auth/service-account.json`), `PORT` (`3000`), and `NODE_ENV` (`production`). MongoDB runs without authentication in the default config.

## Production Deploy

### deploy.sh

```bash
./scripts/deploy.sh
```

The script does the following:

1. Tests SSH connectivity to the deploy host
2. Builds the frontend locally via `npm run build` (runs `vite build --mode production`)
3. Rsyncs `server/` to the remote (excluding `node_modules`, `dist`, `.env`, and `auth`)
4. Rsyncs `dist/` (built frontend) to the remote
5. Copies `server/.env` and `server/auth/` if they exist locally
6. Copies `server/data/` if it exists
7. SSHs in and runs `docker compose up -d --build --force-recreate`
8. Waits 5 seconds, checks the `/api/` health endpoint

### Connection Details

| | Address |
|---|---|
| Deploy host (VPN) | `mbabb.fridayinstitute.net:1022` |
| Public URL | `https://speedtest.mbabb.friday.institute` |
| API health check | `https://speedtest.mbabb.friday.institute/api/` |

Override the deploy target:

```bash
DEPLOY_HOST=other-host.example.com DEPLOY_PORT=22 ./scripts/deploy.sh
```

### What runs on the server

Apache serves the static frontend from `~/speedtest/dist/` and reverse-proxies `/api/*` to the Hono container on `127.0.0.1:3200`. Docker Compose runs two containers:

- `api`—the Hono server (Node.js 22 Alpine), port 3000 inside the container, mapped to `127.0.0.1:3200` on the host
- `mongo`—MongoDB 8 with a health check, data in a named volume (`mongo-data`)

### Manual server operations

```bash
# SSH into the server
ssh -p 1022 mbabb@mbabb.fridayinstitute.net

# Check container status
cd ~/speedtest/server && docker compose ps

# View API logs
docker compose logs -f api

# View MongoDB logs
docker compose logs -f mongo

# Restart containers
docker compose restart

# Full rebuild
docker compose up -d --build --force-recreate
```

## EC2 Speedtest Server Provisioning

The `server/src/infra/ec2-deployer.ts` module provisions lightweight speedtest-only instances on AWS EC2. Each instance runs an inline Node.js server (generated via user-data) that serves the LibreSpeed download/upload/ping endpoints and heartbeats to the central API.

### How it works

1. The deployer creates (or reuses) a security group named `speedtest-server-sg` with inbound rules for HTTP (80, 443) and SSH (22)
2. Finds the latest Amazon Linux 2023 AMI in the target region
3. Launches a `t3.micro` instance (configurable) with a user-data script that installs Docker and starts the speedtest container
4. The instance registers itself with the central API at `/api/internal/servers/{serverId}/heartbeat` via periodic PUT

### Configuration

EC2 provisioning requires AWS credentials with `ec2:RunInstances`, `ec2:DescribeImages`, `ec2:CreateSecurityGroup`, `ec2:AuthorizeSecurityGroupIngress`, and `ec2:DescribeSecurityGroups` permissions.

### Speedtest server environment variables

These are set via the EC2 user-data script, not `server/.env`:

| Variable | Description |
|---|---|
| `CENTRAL_API_URL` | URL of the central API for heartbeat registration |
| `SERVER_ID` | Unique server identifier |
| `SERVER_NAME` | Display name |
| `SERVER_REGION` | Region identifier |
| `SERVER_SECRET` | Shared secret for heartbeat auth |
| `SERVER_CAPACITY` | Max concurrent tests (default: 50) |

Deployed servers appear in the admin settings view (`/admin/settings`) and in the client-side server selector. The client pings all registered servers and selects the one with the lowest latency.

## Seed Scripts

Two seed scripts exist for development:

```bash
# Import subnet CSV data into MongoDB
cd server && npx tsx src/seed.ts <path-to-csv>

# Generate ~3,000 fake test sessions for dashboard development
cd server && npx tsx src/seed-dashboard.ts
```

The dashboard seed generates sessions spread over 90 days, concentrated in NC with some US-wide samples.

## DNS

DNS for `friday.institute` is managed in AWS Route53, hosted zone `ZVBTLAAD8BV9S`.

The production speedtest is at `speedtest.mbabb.friday.institute`, pointed at the EC2 instance running the main API and frontend. EC2 speedtest servers get A records under the same zone, typically named by region (e.g., `speedtest-use1.mbabb.friday.institute`).

## SSL

TLS certificates come from Let's Encrypt, managed by certbot on the production host. The Apache virtual host config references the certificate and key files. Certbot's systemd timer handles auto-renewal.

To manually renew:

```bash
sudo certbot renew
sudo systemctl reload apache2
```

To issue a new certificate for a new subdomain:

```bash
sudo certbot certonly --apache -d new-subdomain.mbabb.friday.institute
```
