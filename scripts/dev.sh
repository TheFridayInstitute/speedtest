#!/bin/bash
# Start speedtest dev environment.
#   MongoDB:  local mongod on $MONGO_PORT
#   Backend:  http://localhost:$BACKEND_PORT  (Hono)
#   Frontend: http://localhost:$FRONTEND_PORT (Vite, proxies /api to backend)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ── Config ─────────────────────────────────────────────────────────────

FRONTEND_PORT="${FRONTEND_PORT:-8080}"
BACKEND_PORT="${BACKEND_PORT:-3200}"
MONGO_PORT="${MONGO_PORT:-27018}"
MONGO_DATA="${MONGO_DATA:-/tmp/speedtest-mongo-data}"

# ── Port availability ──────────────────────────────────────────────────

find_free_port() {
    local port="$1" max="${2:-$((port + 100))}"
    while [ "$port" -le "$max" ]; do
        if ! lsof -iTCP:"$port" -sTCP:LISTEN &>/dev/null; then
            echo "$port"
            return
        fi
        port=$((port + 1))
    done
    echo "No free port in range $1-$max" >&2
    exit 1
}

FRONTEND_PORT="$(find_free_port "$FRONTEND_PORT")"
BACKEND_PORT="$(find_free_port "$BACKEND_PORT")"
MONGO_PORT="$(find_free_port "$MONGO_PORT")"

# ── Start local MongoDB ───────────────────────────────────────────────

mkdir -p "$MONGO_DATA"
if lsof -iTCP:"$MONGO_PORT" -sTCP:LISTEN &>/dev/null; then
    echo "[mongo] Already running on port $MONGO_PORT"
else
    mongod --dbpath "$MONGO_DATA" --port "$MONGO_PORT" \
        --logpath "$MONGO_DATA/mongod.log" --logappend &
    MONGO_PID=$!
    sleep 2
    echo "[mongo] Started on port $MONGO_PORT (data: $MONGO_DATA)"
fi

# ── Start backend ──────────────────────────────────────────────────────

(
    cd "$ROOT_DIR/server"
    export PORT="$BACKEND_PORT"
    export MONGODB_URI="mongodb://localhost:${MONGO_PORT}/speedtest-db"
    npx tsx watch src/index.ts 2>&1 | sed "s/^/[api] /" &
    wait
) &
BACKEND_PID=$!

# ── Start frontend ─────────────────────────────────────────────────────

(
    cd "$ROOT_DIR"
    npx vite --port "$FRONTEND_PORT" --mode development 2>&1 | sed "s/^/[web] /" &
    wait
) &
FRONTEND_PID=$!

# ── Cleanup ────────────────────────────────────────────────────────────

cleanup() {
    echo ""
    echo "Shutting down..."
    kill "$BACKEND_PID" "$FRONTEND_PID" ${MONGO_PID:-} 2>/dev/null || true
    kill "$(jobs -p)" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo ""
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend:  http://localhost:${BACKEND_PORT}"
echo "  MongoDB:  localhost:${MONGO_PORT} (local, data: $MONGO_DATA)"
echo ""

wait
