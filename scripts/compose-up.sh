#!/bin/sh
# Prefer prebuilt GHCR images (works on tiny VPS). Falls back to local build.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "Missing .env — run scripts/prepare-docker-env.sh first" >&2
  exit 1
fi

echo "Pulling prebuilt images (no local CRA build)…"
if docker compose pull; then
  docker compose up -d --no-build
  echo "Stack started from GHCR images."
  exit 0
fi

echo "Pull failed — falling back to local build (needs RAM or swap)…"
# Temporary swap helps small Linux hosts survive CRA (requires sudo).
SWAPFILE="${TMPDIR:-/tmp}/veritas-build-swap"
cleanup() {
  if [ "${SWAP_ON:-0}" = "1" ]; then
    sudo swapoff "$SWAPFILE" 2>/dev/null || true
    sudo rm -f "$SWAPFILE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  if ! swapon --show 2>/dev/null | grep -q .; then
    echo "Adding 4G temporary swap for build…"
    sudo fallocate -l 4G "$SWAPFILE" 2>/dev/null \
      || sudo dd if=/dev/zero of="$SWAPFILE" bs=1M count=4096 status=none
    sudo chmod 600 "$SWAPFILE"
    sudo mkswap "$SWAPFILE" >/dev/null
    sudo swapon "$SWAPFILE"
    SWAP_ON=1
  fi
fi

VERITAS_PULL_POLICY=never docker compose up -d --build
echo "Stack started from local build."
