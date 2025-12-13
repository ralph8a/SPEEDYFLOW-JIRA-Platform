#!/usr/bin/env bash
# Run everything (Linux/macOS)
# Usage: chmod +x run_all.sh && ./run_all.sh

set -e
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

# Pull/build and start in detached mode
if command -v docker >/dev/null 2>&1; then
  echo "Starting services with docker compose..."
  docker compose -f docker-compose.yml pull || true
  docker compose -f docker-compose.yml up --build -d
else
  echo "Docker not found. Install Docker and try again." >&2
  exit 1
fi

# Read ML_SERVICE_URL from .env or default
ML_URL="http://localhost:5001"
BACKEND_URL="http://localhost:5000"
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  ML_URL=${ML_SERVICE_URL:-$ML_URL}
  BACKEND_URL=${BACKEND_URL:-$BACKEND_URL}
fi

wait_for_http() {
  url="$1"
  timeout=${2:-120}
  echo -n "Waiting for $url"
  SECONDS=0
  until curl -sSf "$url" >/dev/null 2>&1; do
    sleep 2
    echo -n "."
    if [ $SECONDS -ge $timeout ]; then
      echo "\nTimed out waiting for $url"
      return 1
    fi
  done
  echo " OK"
  return 0
}

wait_for_http "$ML_URL/health" 120 || echo "ML service did not become healthy"
wait_for_http "$BACKEND_URL/health" 120 || echo "Backend did not become healthy"

if [ $? -eq 0 ]; then
  echo "All services are up. Opening backend in default browser..."
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$BACKEND_URL" || true
  elif command -v open >/dev/null 2>&1; then
    open "$BACKEND_URL" || true
  fi
  echo "Tailing logs (Ctrl+C to stop)"
  docker compose logs -f --tail=200
else
  echo "Showing recent logs to help debug"
  docker compose logs --tail=200
  exit 1
fi
