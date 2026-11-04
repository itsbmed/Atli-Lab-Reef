@echo off
rem Baut das Server-Archiv mit Backend und Frontend nach releases\ (Details in build-release.ps1).
rem Optional: build-release.bat -BasePath /lab/   -SkipFrontend   -Format tar.gz
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-release.ps1" %*
if "%~1"=="" pause
