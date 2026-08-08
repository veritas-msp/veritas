#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Missing .env — run scripts/prepare-docker-env.sh first" >&2
  exit 1
fi

docker compose up -d --build
docker compose ps
