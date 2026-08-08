#Requires -Version 5.1
param(
  [string]$Version = $(if ($env:VERITAS_INSTALLER_VERSION) { $env:VERITAS_INSTALLER_VERSION } else { "1.0.0" }),
  [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Src = Join-Path $Root "src\VeritasAgent"
$PublishDir = Join-Path $Root "build\publish"
$DistDir = Join-Path $Root "dist"
$MsiSource = Join-Path $Root "msi\Product.wxs"
$OutMsi = Join-Path $DistDir "VeritasAgent-Windows-Setup.msi"

function Find-WiX {
  $candidates = @(
    (Join-Path $env:WIX "bin\candle.exe"),
    "${env:ProgramFiles(x86)}\WiX Toolset v3.14\bin\candle.exe",
    "${env:ProgramFiles(x86)}\WiX Toolset v3.11\bin\candle.exe",
    "${env:ProgramFiles}\WiX Toolset v3.14\bin\candle.exe"
  )
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) {
      return (Split-Path -Parent $c)
    }
  }
  return $null
}

function Inject-ServiceInstall {
  param([string]$AgentFilesWxs)

  $xml = Get-Content $AgentFilesWxs -Raw -Encoding UTF8
  if ($xml -match 'ServiceInstall') { return }

  $serviceXml = @"
        <ServiceInstall
          Id="VeritasAgentServiceInstall"
          Name="VeritasAgent"
          DisplayName="Veritas Agent"
          Description="Veritas RMM inventory and heartbeat service"
          Type="ownProcess"
          Start="auto"
          Account="LocalSystem"
          ErrorControl="normal"
          Vital="yes" />
        <ServiceControl
          Id="VeritasAgentServiceControl"
          Name="VeritasAgent"
          Start="install"
          Stop="both"
          Remove="uninstall"
          Wait="yes" />
"@

  # Inject before the closing tag of the component that contains VeritasAgent.exe
  $pattern = '(?s)(<Component[^>]*>\s*<File[^>]*Source="[^"]*VeritasAgent\.exe"[^>]*/>)'
  if ($xml -notmatch $pattern) {
    throw "Could not find VeritasAgent.exe component in harvested WiX fragment"
  }
  $xml = [regex]::Replace($xml, $pattern, "`$1`r`n$serviceXml", 1)
  Set-Content -Path $AgentFilesWxs -Value $xml -Encoding UTF8
}

Write-Host ("=== Veritas Agent build {0} ===" -f $Version)
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw "dotnet SDK is required"
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
if (Test-Path $PublishDir) {
  Remove-Item -Recurse -Force $PublishDir
}
New-Item -ItemType Directory -Force -Path $PublishDir | Out-Null

$wxs = Get-Content $MsiSource -Raw -Encoding UTF8
$wxs = $wxs -replace 'Version="\d+\.\d+\.\d+\.\d+"', ('Version="{0}.0"' -f $Version)
Set-Content -Path $MsiSource -Value $wxs -Encoding UTF8

Write-Host "Publishing .NET agent (exe + DLLs)..."
$asmVersion = "$Version.0"
dotnet publish $Src -c $Configuration -r win-x64 --self-contained true `
  -p:PublishSingleFile=false `
  -p:Version=$Version `
  -p:AssemblyVersion=$asmVersion `
  -p:FileVersion=$asmVersion `
  -o $PublishDir
if ($LASTEXITCODE -ne 0) {
  throw "dotnet publish failed"
}

$exe = Join-Path $PublishDir "VeritasAgent.exe"
if (-not (Test-Path $exe)) {
  throw ("Published exe not found: {0}" -f $exe)
}

# Drop development junk from publish folder
Get-ChildItem $PublishDir -Filter "*.pdb" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem $PublishDir -Filter "appsettings.Development.json" -ErrorAction SilentlyContinue | Remove-Item -Force

$wixBin = Find-WiX
if (-not $wixBin) {
  Write-Warning "WiX Toolset not found - MSI not built. Published binaries are in $PublishDir"
  Write-Host "Install WiX 3.14+ then re-run this script."
  exit 0
}

$candle = Join-Path $wixBin "candle.exe"
$light = Join-Path $wixBin "light.exe"
$heat = Join-Path $wixBin "heat.exe"
$objDir = Join-Path $Root "build\wix"
New-Item -ItemType Directory -Force -Path $objDir | Out-Null

$agentFilesWxs = Join-Path $objDir "AgentFiles.wxs"
Write-Host "Harvesting publish folder with heat..."
& $heat dir $PublishDir -nologo -cg AgentFiles -gg -g1 -sfrag -srd -sreg -scom -dr INSTALLFOLDER -var var.PublishDir -out $agentFilesWxs
if ($LASTEXITCODE -ne 0) {
  throw "heat failed"
}

Inject-ServiceInstall -AgentFilesWxs $agentFilesWxs

Write-Host ("Compiling MSI with WiX ({0})..." -f $wixBin)
$wixUiExt = Join-Path $wixBin "WixUIExtension.dll"
$frLoc = Join-Path (Split-Path $wixBin -Parent) "SDK\wixui\WixUI_fr-fr.wxl"
if (-not (Test-Path $frLoc)) {
  $frLoc = "C:\Program Files (x86)\WiX Toolset v3.14\SDK\wixui\WixUI_fr-fr.wxl"
}

Push-Location (Join-Path $Root "msi")
try {
  & $candle -nologo -arch x64 ("-dPublishDir={0}" -f $PublishDir) -ext $wixUiExt -out (Join-Path $objDir "Product.wixobj") "Product.wxs"
  if ($LASTEXITCODE -ne 0) { throw "candle Product.wxs failed" }

  & $candle -nologo -arch x64 ("-dPublishDir={0}" -f $PublishDir) -out (Join-Path $objDir "AgentFiles.wixobj") $agentFilesWxs
  if ($LASTEXITCODE -ne 0) { throw "candle AgentFiles.wxs failed" }

  $lightArgs = @(
    "-nologo",
    "-sice:ICE61",
    "-ext", $wixUiExt,
    "-cultures:fr-fr",
    "-out", $OutMsi,
    (Join-Path $objDir "Product.wixobj"),
    (Join-Path $objDir "AgentFiles.wixobj")
  )
  if (Test-Path $frLoc) {
    $lightArgs = @("-loc", $frLoc) + $lightArgs
  }
  & $light @lightArgs
  if ($LASTEXITCODE -ne 0) {
    throw "light failed"
  }
}
finally {
  Pop-Location
}

Copy-Item $OutMsi (Join-Path $PublishDir "VeritasAgent-Windows-Setup.msi") -Force
$dllCount = @(Get-ChildItem $PublishDir -Filter "*.dll").Count
Write-Host ("OK: {0}" -f $OutMsi)
Write-Host ("Payload: VeritasAgent.exe + {0} DLL(s) -> Program Files\Veritas\Agent\" -f $dllCount)
