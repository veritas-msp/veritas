#!/bin/sh
# Start backend; never fail the container because of .env persistence.
set -eu

SECRETS_FILE="/app/uploads/.boot-secrets"
LEASE_FILE="/app/uploads/.license-lease"

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

# Prefer persisted Pro key from offline lease JSON when env/boot-secrets lack it.
hydrate_license_from_lease() {
  [ -f "$LEASE_FILE" ] || return 0
  if [ -n "${VERITAS_LICENSE_KEY:-}" ]; then
    return 0
  fi
  # Extract "licenseKey": "VRT-PRO-...." without requiring jq
  key="$(sed -n 's/.*"licenseKey"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$LEASE_FILE" | head -n 1 | tr -d '\r')"
  if [ -n "$key" ]; then
    VERITAS_LICENSE_KEY="$key"
    export VERITAS_LICENSE_KEY
    if [ -z "${VERITAS_EDITION:-}" ]; then
      VERITAS_EDITION="pro"
      export VERITAS_EDITION
    fi
    echo "Restored VERITAS_LICENSE_KEY from offline lease file"
  fi
}

save_secrets() {
  umask 077
  {
    echo "export JWT_SECRET='${JWT_SECRET}'"
    echo "export ENCRYPTION_KEY='${ENCRYPTION_KEY}'"
    if [ -n "${VERITAS_LICENSE_KEY:-}" ]; then
      echo "export VERITAS_LICENSE_KEY='${VERITAS_LICENSE_KEY}'"
    fi
    if [ -n "${VERITAS_EDITION:-}" ]; then
      echo "export VERITAS_EDITION='${VERITAS_EDITION}'"
    fi
  } > "$SECRETS_FILE"
}

load_secret_file
hydrate_license_from_lease

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

# Keep offline / Pro license key across container recreates (uploads volume)
if [ -n "${VERITAS_LICENSE_KEY:-}" ]; then
  export VERITAS_LICENSE_KEY
fi
if [ -n "${VERITAS_EDITION:-}" ]; then
  export VERITAS_EDITION
fi

# Persist across container recreates (uploads volume)
save_secrets 2>/dev/null || echo "WARNING: could not persist secrets to $SECRETS_FILE" >&2

echo "Starting Veritas backend..."
exec node server.js
