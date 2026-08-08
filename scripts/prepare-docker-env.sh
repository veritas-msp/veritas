#!/bin/sh
# Generate a local .env for Docker Compose if missing or incomplete.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
EXAMPLE="$ROOT/.env.docker.example"
TARGET="$ROOT/.env"

rand() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    # Portable fallback
    dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
  fi
}

if [ ! -f "$EXAMPLE" ]; then
  echo "Missing $EXAMPLE" >&2
  exit 1
fi

if [ ! -f "$TARGET" ]; then
  cp "$EXAMPLE" "$TARGET"
  echo "Created $TARGET from .env.docker.example"
fi

# Fill empty secrets in place (keep any value the user already set).
fill_if_empty() {
  key="$1"
  val="$2"
  # Match KEY= or KEY=<whitespace only>
  if grep -Eq "^${key}=[[:space:]]*$" "$TARGET" || grep -Eq "^${key}=$" "$TARGET"; then
    # Portable in-place edit without requiring GNU sed
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$val" '
      BEGIN { FS="="; OFS="=" }
      $1 == k { print k, v; next }
      { print }
    ' "$TARGET" > "$tmp"
    mv "$tmp" "$TARGET"
    echo "Generated $key"
  fi
}

fill_if_empty JWT_SECRET "$(rand)"
fill_if_empty ENCRYPTION_KEY "$(rand)"

echo "Docker env ready: $TARGET"
echo "Next: docker compose up -d --build"
