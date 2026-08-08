$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Test-Path .env)) {
  throw "Missing .env — run scripts/prepare-docker-env.ps1 first"
}

cmd /c "docker compose up -d --build"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmd /c "docker compose ps"
