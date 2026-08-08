#!/usr/bin/env bash
# Install Veritas on a virgin Ubuntu Server (pulls prebuilt images — never builds CRA).
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/veritas-msp/veritas/main/scripts/install-ubuntu.sh | sudo bash
set -euo pipefail

INSTALL_DIR="${VERITAS_INSTALL_DIR:-/opt/veritas}"
REPO_RAW="https://raw.githubusercontent.com/veritas-msp/veritas/main"
BACKEND_IMAGE="ghcr.io/veritas-msp/veritas-backend:latest"
FRONTEND_IMAGE="ghcr.io/veritas-msp/veritas-frontend:latest"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash $0" >&2
  exit 1
fi

echo "==> Installing Docker if needed"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl
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

echo "==> Preparing $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

curl -fsSL "$REPO_RAW/docker-compose.yml" -o docker-compose.yml
curl -fsSL "$REPO_RAW/.env.docker.example" -o .env.docker.example

if [ ! -f .env ]; then
  cp .env.docker.example .env
  JWT=$(openssl rand -hex 32)
  ENC=$(openssl rand -hex 32)
  sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT}/" .env
  sed -i "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=${ENC}/" .env
  echo "Generated JWT_SECRET and ENCRYPTION_KEY in .env"
fi

echo "==> Pulling prebuilt images (no local npm/React build)"
if ! docker pull "$BACKEND_IMAGE" || ! docker pull "$FRONTEND_IMAGE"; then
  cat >&2 <<'EOF'

ERROR: cannot pull ghcr.io/veritas-msp/veritas-* images.

They may still be building, or the packages are private.
1) Check https://github.com/veritas-msp/veritas/actions
2) On GitHub → Packages → veritas-backend / veritas-frontend → Package settings → Change visibility → Public

Do NOT run: docker compose up --build   (that OOMs on small VPS)
EOF
  exit 1
fi

echo "==> Starting stack"
docker compose up -d

echo
echo "Veritas is starting."
echo "  UI:  http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000"
echo "  Setup wizard: http://SERVER_IP:3000/setup"
echo "  Files: $INSTALL_DIR"
echo
docker compose ps
