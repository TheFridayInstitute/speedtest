#!/bin/bash
# Deploy speedtest to mbabb.fi.ncsu.edu.
# Syncs code, builds frontend, deploys Docker containers.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Config ─────────────────────────────────────────────────────────────

DEPLOY_HOST="${DEPLOY_HOST:-mbabb.fridayinstitute.net}"
DEPLOY_PORT="${DEPLOY_PORT:-1022}"
DEPLOY_USER="${DEPLOY_USER:-mbabb}"
REMOTE_DIR="~/speedtest"

SSH_CMD="ssh -o StrictHostKeyChecking=no -p $DEPLOY_PORT"
SCP_CMD="scp -o StrictHostKeyChecking=no -P $DEPLOY_PORT"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
err() { echo -e "${RED}[error]${NC} $1"; exit 1; }

# ── Test SSH ───────────────────────────────────────────────────────────

log "Testing SSH connection..."
$SSH_CMD $DEPLOY_USER@$DEPLOY_HOST 'echo ok' &>/dev/null || err "SSH connection failed"

# ── Build frontend locally ─────────────────────────────────────────────

log "Building frontend..."
npm run build

# ── Sync to server ─────────────────────────────────────────────────────

log "Syncing files to server..."

# Create remote dir
$SSH_CMD $DEPLOY_USER@$DEPLOY_HOST "mkdir -p $REMOTE_DIR/server $REMOTE_DIR/dist"

# Sync server code
rsync -az --delete \
    -e "ssh -o StrictHostKeyChecking=no -p $DEPLOY_PORT" \
    --exclude node_modules --exclude dist --exclude .env --exclude auth \
    "$ROOT_DIR/server/" \
    "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/server/"

# Sync built frontend
rsync -az --delete \
    -e "ssh -o StrictHostKeyChecking=no -p $DEPLOY_PORT" \
    "$ROOT_DIR/dist/" \
    "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/dist/"

# Sync .env if exists
if [ -f "$ROOT_DIR/server/.env" ]; then
    $SCP_CMD "$ROOT_DIR/server/.env" "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/server/.env"
fi

# Sync auth dir if exists
if [ -d "$ROOT_DIR/server/auth" ]; then
    rsync -az \
        -e "ssh -o StrictHostKeyChecking=no -p $DEPLOY_PORT" \
        "$ROOT_DIR/server/auth/" \
        "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/server/auth/"
fi

# Sync data dir
if [ -d "$ROOT_DIR/server/data" ]; then
    rsync -az \
        -e "ssh -o StrictHostKeyChecking=no -p $DEPLOY_PORT" \
        "$ROOT_DIR/server/data/" \
        "$DEPLOY_USER@$DEPLOY_HOST:$REMOTE_DIR/server/data/"
fi

# ── Deploy containers ──────────────────────────────────────────────────

log "Building and deploying containers..."

$SSH_CMD $DEPLOY_USER@$DEPLOY_HOST << 'ENDSSH'
    set -e
    cd ~/speedtest/server
    docker compose up -d --build --force-recreate
    docker image prune -f >/dev/null 2>&1 || true
    echo ""
    docker compose ps
ENDSSH

# ── Verify ─────────────────────────────────────────────────────────────

log "Waiting for server to start..."
sleep 5

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://mbabb.fi.ncsu.edu/api/" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    log "Server is healthy!"
else
    log "Server returned HTTP $HEALTH (may still be starting)"
fi

log "Done."
echo "  Frontend: https://mbabb.fi.ncsu.edu/"
echo "  API:      https://mbabb.fi.ncsu.edu/api/"
