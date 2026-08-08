#!/usr/bin/env bash
# Classic install on Ubuntu: clone repo + docker compose build (no GHCR).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/veritas-msp/veritas/main/scripts/install-ubuntu.sh | sudo bash
set -euo pipefail

INSTALL_DIR="${VERITAS_INSTALL_DIR:-/opt/veritas}"
REPO_URL="https://github.com/veritas-msp/veritas.git"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

echo "==> Installing Docker / Git if needed"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git openssl

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose plugin missing" >&2
  exit 1
fi

echo "==> Clone / update repository in $INSTALL_DIR"
if [ -d "$INSTALL_DIR/.git" ]; then
  git -C "$INSTALL_DIR" fetch --depth 1 origin main
  git -C "$INSTALL_DIR" checkout -f main
  git -C "$INSTALL_DIR" reset --hard origin/main
else
  rm -rf "$INSTALL_DIR"
  git clone --depth 1 --branch main "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

if [ ! -f .env ]; then
  cp .env.docker.example .env
  echo "Created .env (secrets can stay empty — set in /setup or auto-generated on first start)"
fi

# Swap helps the frontend CRA build on small VPS
SWAPFILE=/swapfile-veritas-build
if ! swapon --show 2>/dev/null | grep -q .; then
  echo "==> Adding 4G swap for Docker build"
  fallocate -l 4G "$SWAPFILE" 2>/dev/null || dd if=/dev/zero of="$SWAPFILE" bs=1M count=4096 status=none
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE" >/dev/null
  swapon "$SWAPFILE"
fi

echo "==> Building and starting stack (classic docker compose)"
docker compose up -d --build

echo
echo "Veritas is starting."
echo "  Setup: http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000/setup"
echo "  Files: $INSTALL_DIR"
docker compose ps
