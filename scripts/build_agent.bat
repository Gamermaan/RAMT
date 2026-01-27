@echo off
REM RAMP Agent Build Script for Windows
REM Cross-compiles Go agent for multiple platforms

echo =========================================
echo RAMP Agent Build Script (Windows)
echo =========================================

set OUTPUT_DIR=..\dist
set VERSION=1.0.0

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

cd ..\agent

echo [*] Building for Windows (amd64)...
set GOOS=windows
set GOARCH=amd64
go build -trimpath -ldflags="-s -w -X main.version=%VERSION%" -o "%OUTPUT_DIR%\ramp-agent-windows-amd64.exe" .

echo [*] Building for Linux (amd64)...
set GOOS=linux
set GOARCH=amd64
go build -trimpath -ldflags="-s -w -X main.version=%VERSION%" -o "%OUTPUT_DIR%\ramp-agent-linux-amd64" .

echo [*] Building for macOS (amd64)...
set GOOS=darwin
set GOARCH=amd64
go build -trimpath -ldflags="-s -w -X main.version=%VERSION%" -o "%OUTPUT_DIR%\ramp-agent-darwin-amd64" .

echo.
echo [+] Build complete! Binaries available in: %OUTPUT_DIR%
echo.
dir "%OUTPUT_DIR%"

pause
