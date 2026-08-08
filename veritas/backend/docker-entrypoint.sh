#!/bin/sh
# Start backend; never fail the container because of .env persistence.
set -eu

SECRETS_FILE="/app/uploads/.boot-secrets"

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif [ -r /dev/urandom ]; then
    dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
  else
    # last resort (unique enough for first boot / setup)
    echo "veritas$(date +%s)$$" | od -An -tx1 | tr -d ' \n'
  fi
}

mkdir -p /app/uploads /app/uploads/tickets 2>/dev/null || true

# If Docker created .env as a directory (classic mount mistake), ignore it.
if [ -d /app/.env ]; then
  echo "WARNING: /app/.env is a directory (invalid Docker mount). Ignoring it." >&2
fi

load_secret_file() {
  [ -f "$SECRETS_FILE" ] || return 0
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
}

save_secrets() {
  umask 077
  cat > "$SECRETS_FILE" <<EOF
export JWT_SECRET='${JWT_SECRET}'
export ENCRYPTION_KEY='${ENCRYPTION_KEY}'
EOF
}

load_secret_file

if [ -z "${JWT_SECRET:-}" ]; then
  JWT_SECRET="$(rand_hex)"
  export JWT_SECRET
  echo "Generated JWT_SECRET (first boot — you can change it in /setup)"
fi
export JWT_SECRET

if [ -z "${ENCRYPTION_KEY:-}" ]; then
  ENCRYPTION_KEY="$(rand_hex)"
  export ENCRYPTION_KEY
  echo "Generated ENCRYPTION_KEY (first boot — you can change it in /setup)"
fi
export ENCRYPTION_KEY

# Persist across container recreates (uploads volume)
save_secrets 2>/dev/null || echo "WARNING: could not persist secrets to $SECRETS_FILE" >&2

echo "Starting Veritas backend..."
exec node server.js
