# Prefer prebuilt GHCR images (works on tiny VPS). Falls back to local build.
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path .env)) {
  throw "Missing .env — run scripts/prepare-docker-env.ps1 first"
}

Write-Host "Pulling prebuilt images (no local CRA build)..."
cmd /c "docker compose pull"
if ($LASTEXITCODE -eq 0) {
  cmd /c "docker compose up -d --no-build"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "Stack started from GHCR images."
  exit 0
}

Write-Host "Pull failed — falling back to local build (needs RAM or swap)..."
$env:VERITAS_PULL_POLICY = "never"
cmd /c "docker compose up -d --build"
exit $LASTEXITCODE
