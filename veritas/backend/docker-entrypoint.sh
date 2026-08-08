#!/bin/sh
set -eu

missing=""
[ -z "${JWT_SECRET:-}" ] && missing="$missing JWT_SECRET"
[ -z "${ENCRYPTION_KEY:-}" ] && missing="$missing ENCRYPTION_KEY"

if [ -n "$missing" ]; then
  echo "Veritas backend: missing required env:$missing" >&2
  echo "Run scripts/prepare-docker-env.sh (or .ps1) before: docker compose up" >&2
  exit 1
fi

exec node server.js
