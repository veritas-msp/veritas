# Post-up smoke checks for a local Docker Compose install.
# Usage (after docker compose up -d --build):
#   powershell -ExecutionPolicy Bypass -File .\scripts\docker-smoke.ps1

$ErrorActionPreference = "Stop"
$ui = "http://localhost:3000"
$api = "http://localhost:3001"

function Assert-Ok([string]$name, [string]$url) {
  Write-Host -NoNewline "check $name ... "
  $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
  if ($res.StatusCode -lt 200 -or $res.StatusCode -ge 300) {
    throw "$name failed: HTTP $($res.StatusCode) ($url)"
  }
  Write-Host "ok ($($res.StatusCode))"
}

Assert-Ok "frontend" "$ui/"
Assert-Ok "api live" "$api/health/live"
Assert-Ok "api via nginx" "$ui/health/live"
Assert-Ok "setup status" "$ui/api/setup/status"

Write-Host ""
Write-Host "Smoke OK. Open $ui/setup to finish installation."
