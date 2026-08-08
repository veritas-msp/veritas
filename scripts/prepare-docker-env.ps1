# Prepare .env for Docker Compose (Windows PowerShell).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\prepare-docker-env.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Example = Join-Path $Root ".env.docker.example"
$Target = Join-Path $Root ".env"

function New-Secret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

if (-not (Test-Path $Example)) {
  throw "Missing $Example"
}

if (-not (Test-Path $Target)) {
  Copy-Item $Example $Target
  Write-Host "Created $Target from .env.docker.example"
}

$content = Get-Content $Target -Raw
function Set-IfEmpty([string]$key, [string]$value) {
  $script:content = [regex]::Replace(
    $script:content,
    "(?m)^$key=\s*$",
    { param($m) "$key=$value" },
    1
  )
  if ($script:content -match "(?m)^$key=.+") {
    # ok
  }
}

$jwt = New-Secret
$enc = New-Secret
$before = $content
Set-IfEmpty "JWT_SECRET" $jwt
Set-IfEmpty "ENCRYPTION_KEY" $enc

if ($content -ne $before) {
  if ($content -match "(?m)^JWT_SECRET=$jwt$") { Write-Host "Generated JWT_SECRET" }
  if ($content -match "(?m)^ENCRYPTION_KEY=$enc$") { Write-Host "Generated ENCRYPTION_KEY" }
}

Set-Content -Path $Target -Value $content.TrimEnd() -NoNewline
Add-Content -Path $Target -Value "`n"
Write-Host "Docker env ready: $Target"
Write-Host "Next: docker compose up -d --build"
