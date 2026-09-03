# Place the prebuilt installer here (gitignored):
#   VeritasAgent-Windows-Setup.msi
#
# This folder holds the binary artifact, not the agent source.
# Source lives in ../src and ../msi ; build with:
#   cd veritas/backend && npm run build:rmm-agent
# (Windows machine with .NET SDK + WiX Toolset)
#
# On the Veritas host (same server as Docker), keep the MSI at:
#   veritas/RMM/Agents/windows/dist/VeritasAgent-Windows-Setup.msi
# docker-compose mounts ./veritas/RMM → /RMM so Administration → RMM can serve it.
