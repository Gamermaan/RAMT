#!/bin/bash

# RAMP Agent Build Script
# Cross-compiles Go agent for multiple platforms

set -e

echo "========================================="
echo "RAMP Agent Build Script"
echo "========================================="

# Configuration
OUTPUT_DIR="../dist"
VERSION="1.0.0"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Create output directory
mkdir -p "$OUTPUT_DIR"

cd ../agent

echo "[*] Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=$VERSION -X main.buildDate=$BUILD_DATE" -o "$OUTPUT_DIR/ramp-agent-windows-amd64.exe" .

echo "[*] Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=$VERSION -X main.buildDate=$BUILD_DATE" -o "$OUTPUT_DIR/ramp-agent-linux-amd64" .

echo "[*] Building for Linux (arm64)..."
GOOS=linux GOARCH=arm64 go build -trimpath -ldflags="-s -w -X main.version=$VERSION -X main.buildDate=$BUILD_DATE" -o "$OUTPUT_DIR/ramp-agent-linux-arm64" .

echo "[*] Building for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=$VERSION -X main.buildDate=$BUILD_DATE" -o "$OUTPUT_DIR/ramp-agent-darwin-amd64" .

echo "[*] Building for macOS (arm64)..."
GOOS=darwin GOARCH=arm64 go build -trimpath -ldflags="-s -w -X main.version=$VERSION -X main.buildDate=$BUILD_DATE" -o "$OUTPUT_DIR/ramp-agent-darwin-arm64" .

echo ""
echo "[+] Build complete! Binaries available in: $OUTPUT_DIR"
echo ""
ls -lh "$OUTPUT_DIR"
