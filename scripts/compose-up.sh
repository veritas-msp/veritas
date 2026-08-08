#!/bin/sh
# Start Veritas from prebuilt GHCR images only (never builds on the server).
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Missing .env — run scripts/prepare-docker-env.sh first" >&2
  exit 1
fi

echo "Pulling prebuilt images (no local React build)…"
docker compose pull
docker compose up -d
echo "Stack started. Open http://SERVER_IP:3000/setup"
docker compose ps
