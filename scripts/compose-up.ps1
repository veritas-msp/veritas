# Start Veritas from prebuilt GHCR images only (never builds on the server).
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path .env)) {
  throw "Missing .env — run scripts/prepare-docker-env.ps1 first"
}

Write-Host "Pulling prebuilt images (no local React build)..."
cmd /c "docker compose pull"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmd /c "docker compose up -d"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Stack started. Open http://localhost:3000/setup"
cmd /c "docker compose ps"
