@echo off
:: Launch Veritas Agent configuration wizard (re-run anytime)
cd /d "%~dp0"
start "" "%~dp0VeritasAgent.exe" --configure
