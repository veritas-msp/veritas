#!/bin/sh
set -eu

# Persist secrets in the mounted host .env when possible (Docker virgin install).
ENV_FILE="${VERITAS_ENV_FILE:-/app/.env}"

rand_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
  fi
}

# Upsert KEY=value in ENV_FILE (create file if needed).
upsert_env() {
  key="$1"
  val="$2"
  if [ ! -f "$ENV_FILE" ]; then
    printf '%s=%s\n' "$key" "$val" > "$ENV_FILE"
    return
  fi
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$ENV_FILE" > "$tmp"
    cat "$tmp" > "$ENV_FILE"
    rm -f "$tmp"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

ensure_secret() {
  name="$1"
  eval "current=\${$name:-}"
  if [ -n "$current" ]; then
    return
  fi
  # Prefer value already stored in mounted .env (previous boot / setup wizard)
  if [ -f "$ENV_FILE" ]; then
    stored="$(awk -F= -v k="$name" '$1==k{print substr($0, index($0,"=")+1); exit}' "$ENV_FILE" | tr -d '\r')"
    if [ -n "$stored" ]; then
      export "$name=$stored"
      echo "Veritas backend: loaded $name from $ENV_FILE"
      return
    fi
  fi
  generated="$(rand_hex)"
  export "$name=$generated"
  if [ -w "$(dirname "$ENV_FILE")" ] || [ -w "$ENV_FILE" ] 2>/dev/null; then
    upsert_env "$name" "$generated"
    echo "Veritas backend: generated $name (saved to $ENV_FILE; setup wizard can change it)"
  else
    echo "Veritas backend: generated ephemeral $name (mount .env to persist across restarts)"
  fi
}

ensure_secret JWT_SECRET
ensure_secret ENCRYPTION_KEY

exec node server.js
