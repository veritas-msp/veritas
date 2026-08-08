# Veritas Agent — Windows (native service)

Native RMM agent for Veritas: **Windows Service** (.NET), packaged as a single **MSI**.

## Layout

```
RMM/Agents/windows/
├── src/VeritasAgent/     # .NET Worker Service
├── msi/Product.wxs       # WiX 3 installer
├── build.ps1             # publish + MSI
├── build/                # intermediate (gitignored)
└── dist/                 # VeritasAgent-Windows-Setup.msi (gitignored or CI artifact)
```

## Runtime

| Item | Value |
|------|--------|
| Service | `VeritasAgent` (LocalSystem) |
| Binaries | `C:\Program Files\Veritas\Agent\` |
| State | `%ProgramData%\Veritas\Agent\` (`config.dat` DPAPI, `logs\`) |
| Protocol | `POST /api/rmm/enroll`, `POST /api/rmm/heartbeat` |

## Silent install (GPO / Intune)

```bat
msiexec /i VeritasAgent-Windows-Setup.msi ^
  APIURL="https://your-veritas.example/api" ^
  TOKEN="<enrollment-token>" ^
  FAMILY="ordinateurs" ^
  /qn /L*v %TEMP%\VeritasAgent-install.log
```

`FAMILY` = `ordinateurs` (workstation) or `serveurs` (server).

## Build

Requirements: .NET SDK 10+, WiX Toolset 3.11+.

```powershell
cd veritas/RMM/Agents/windows
.\build.ps1 -Version 1.0.0
```

Or from the backend:

```bash
cd veritas/backend
npm run build:rmm-agent
```

Output: `dist/VeritasAgent-Windows-Setup.msi` — served by Administration → RMM → Deployment.

## Migration from legacy PowerShell agent

On first start, the service migrates `%ProgramData%\VeritasAgent\config.json` into DPAPI storage and removes scheduled task `VeritasAgentHeartbeat`.

## Self-update

Heartbeat responses include `latestAgentVersion`. When newer than the running build, the agent downloads `GET /api/rmm/agent/update/windows/msi` (Bearer agent secret) and runs a silent MSI upgrade.
