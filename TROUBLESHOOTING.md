# RAMP Troubleshooting Guide

This document contains solutions to common issues encountered during RAMP setup and operation.

---

## Issue #1: SSL Certificate Generation TypeError

### Error Message
```
TypeError: value must be an instance of ipaddress.IPv4Address, ipaddress.IPv6Address, 
ipaddress.IPv4Network, or ipaddress.IPv6Network
```

### Full Error Context
```
File "ssl_gen.py", line 76, in generate_self_signed_cert
    x509.IPAddress("127.0.0.1"),
TypeError: value must be an instance of ipaddress.IPv4Address...
```

### Cause
- **Library Version Incompatibility**: The `cryptography` library version 46.x changed the API
- Older code used: `x509.IPAddress("127.0.0.1")` (string)
- New version requires: `x509.IPAddress(ipaddress.IPv4Address("127.0.0.1"))` (object)

### Solution Applied
**File Modified**: `tools/ssl_gen.py`

**Changes Made**:

1. **Added ipaddress import**:
```python
import ipaddress  # Added this line
from datetime import datetime, timedelta, timezone
```

2. **Fixed IPAddress usage**:
```python
# Old (broken):
x509.IPAddress("127.0.0.1"),

# New (fixed):
x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
```

3. **Fixed datetime deprecation warnings**:
```python
# Old (deprecated):
datetime.utcnow()

# New (recommended):
datetime.now(timezone.utc)
```

### Verification
```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\tools"
python ssl_gen.py
```

Expected output:
```
[*] Generating SSL certificate...
[*] Common Name: RAMP C2 Server
[*] Validity: 365 days
[+] Private key saved: ../c2-server/certs/server.key
[+] Certificate saved: ../c2-server/certs/server.crt
[*] Certificate SHA256 Fingerprint:
    <64-character hex string>
```

### Date Fixed
2026-01-26

---

## Issue #2: Python Version Compatibility

### Symptoms
- Import errors
- Syntax errors in Python code
- Package installation failures

### Solution
Ensure you're using **Python 3.11 or higher**:

```powershell
python --version
# Should show: Python 3.11.x or Python 3.14.x
```

If using older Python:
```powershell
# Uninstall old version
winget uninstall Python.Python

# Install Python 3.11+
winget install Python.Python.3.11
```

---

## Issue #3: Go Module Download Failures

### Error Message
```
go: github.com/google/uuid@v1.5.0: Get "https://proxy.golang.org/...": 
dial tcp: lookup proxy.golang.org: no such host
```

### Solution
```powershell
# Set Go proxy
go env -w GOPROXY=https://proxy.golang.org,direct

# Or use alternative proxy
go env -w GOPROXY=https://goproxy.io,direct

# Clear module cache
go clean -modcache

# Try again
cd agent
go mod download
```

---

## Issue #4: C2 Server Port Already in Use

### Error Message
```
OSError: [WinError 10048] Only one usage of each socket address 
(protocol/network address/port) is normally permitted
```

### Solution

**Check what's using port 8443**:
```powershell
netstat -ano | findstr :8443
```

**Kill the process**:
```powershell
# Find PID from netstat output
taskkill /PID <PID> /F
```

**Or use different port**:
Edit `c2-server/app.py`, change:
```python
port=8443  # Change to 9443 or any free port
```

---

## Issue #5: Agent Won't Connect to C2

### Checklist

1. **Verify C2 Server is Running**:
```powershell
curl.exe -k https://localhost:8443/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

2. **Check Windows Firewall**:
```powershell
# Add firewall rule
netsh advfirewall firewall add rule name="RAMP C2" dir=in action=allow protocol=TCP localport=8443

# Or temporarily disable firewall (testing only!)
netsh advfirewall set allprofiles state off
```

3. **Verify Agent Server Address**:
```powershell
# Make sure you're using correct format
.\ramp-agent-windows.exe --server localhost:8443
# NOT: http://localhost:8443 or https://localhost:8443
```

4. **Check Certificate Pinning**:
If using certificate pinning, ensure fingerprint matches:
```powershell
# Generate new cert and note the fingerprint
cd tools
python ssl_gen.py

# Update agent config with correct fingerprint
```

---

## Issue #6: npm install Fails in GUI Controller

### Error: ENOENT or Permission Denied

**Solution 1 - Clear npm cache**:
```powershell
cd gui-controller
npm cache clean --force
npm install
```

**Solution 2 - Delete node_modules**:
```powershell
rmdir node_modules -Recurse -Force
rmdir package-lock.json -Force
npm install
```

**Solution 3 - Run as Administrator**:
- Right-click PowerShell
- Select "Run as Administrator"
- Navigate to gui-controller folder
- Run `npm install`

---

## Issue #7: Redis Connection Errors (C2 Server)

### Error Message
```
redis.exceptions.ConnectionError: Error 10061 connecting to localhost:6379.
No connection could be made because the target machine actively refused it.
```

### Solution

**Option 1 - Install Redis**:
```powershell
choco install redis-64
redis-server
```

**Option 2 - Use In-Memory Queue (Development)**:
The C2 server automatically falls back to in-memory queue if Redis is unavailable.
Just ignore the warning message - it will work fine for testing.

---

## Issue #8: Electron/GUI Black Screen

### Symptoms
- GUI opens but shows blank/black screen
- Console shows errors

### Solutions

**Solution 1 - Rebuild Electron**:
```powershell
cd gui-controller
npm rebuild electron
```

**Solution 2 - Clear Electron cache**:
```powershell
rmdir $env:APPDATA\ramp-controller -Recurse -Force
npm start
```

**Solution 3 - Check DevTools**:
- Press `Ctrl+Shift+I` in the GUI
- Check Console tab for JavaScript errors
- Share errors for further troubleshooting

---

## Issue #9: Build Script Fails (build_agent.bat)

### Error: 'go' is not recognized

**Solution - Add Go to PATH**:
```powershell
# Find Go installation
where go

# If not found, add to PATH manually
$env:Path += ";C:\Program Files\Go\bin"

# Permanently add to PATH
[System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Go\bin", "Machine")
```

### Error: Cannot find module 'ramp-agent/...'

**Solution - Initialize Go modules**:
```powershell
cd agent
go mod tidy
go mod download
```

---

## Issue #10: Certificate Warnings in Browser/GUI

### Expected Behavior
When connecting to `https://localhost:8443`, you'll see:
- "Your connection is not private"
- "NET::ERR_CERT_AUTHORITY_INVALID"

### This is NORMAL for self-signed certificates

**To proceed**:
- Click "Advanced"
- Click "Proceed to localhost (unsafe)" or "Accept Risk"

**For production**:
- Use Let's Encrypt for real certificates
- Or purchase SSL certificate from CA

---

## Issue #11: Agent Persistence Issues on Windows

### Agent Won't Start on Reboot

**Check Registry**:
```powershell
reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
# Look for "RAMPAgent" entry
```

**Manual Registry Entry**:
```powershell
$exePath = "C:\full\path\to\ramp-agent-windows.exe"
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v RAMPAgent /t REG_SZ /d $exePath /f
```

**Check Startup Folder**:
```powershell
explorer.exe shell:startup
# Look for ramp-agent.exe shortcut
```

---

## Quick Diagnostics Script

Save as `diagnose.ps1` and run to check all components:

```powershell
Write-Host "=== RAMP Diagnostics ===" -ForegroundColor Cyan

# Check Python
Write-Host "`nPython Version:" -ForegroundColor Yellow
python --version

# Check Go
Write-Host "`nGo Version:" -ForegroundColor Yellow
go version

# Check Node.js
Write-Host "`nNode.js Version:" -ForegroundColor Yellow
node --version

# Check npm
Write-Host "`nnpm Version:" -ForegroundColor Yellow
npm --version

# Check if certs exist
Write-Host "`nSSL Certificates:" -ForegroundColor Yellow
if (Test-Path "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server\certs\server.crt") {
    Write-Host "✓ Certificate exists" -ForegroundColor Green
} else {
    Write-Host "✗ Certificate missing - run: python tools/ssl_gen.py" -ForegroundColor Red
}

# Check if agent is built
Write-Host "`nAgent Binary:" -ForegroundColor Yellow
if (Test-Path "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\dist\ramp-agent-windows.exe") {
    Write-Host "✓ Agent built" -ForegroundColor Green
} else {
    Write-Host "✗ Agent not built - run: scripts\build_agent.bat" -ForegroundColor Red
}

# Check port 8443
Write-Host "`nPort 8443 Status:" -ForegroundColor Yellow
$portCheck = netstat -ano | findstr :8443
if ($portCheck) {
    Write-Host "✓ Something is listening on port 8443" -ForegroundColor Green
} else {
    Write-Host "○ Port 8443 is free" -ForegroundColor Gray
}

Write-Host "`n=== End Diagnostics ===" -ForegroundColor Cyan
```

---

## Getting Help

If you encounter an issue not listed here:

1. **Check Logs**:
   - C2 Server: Console output
   - Agent: Console output
   - GUI: Press `Ctrl+Shift+I` for DevTools

2. **Verify Prerequisites**:
   - Python 3.11+
   - Go 1.21+
   - Node.js 18+

3. **Re-read Documentation**:
   - [WINDOWS_QUICKSTART.md](file:///c:/Users/Gurpartap/OneDrive/Desktop/hacking%20tools/malware/RAMP/WINDOWS_QUICKSTART.md)
   - [DEPLOYMENT.md](file:///c:/Users/Gurpartap/OneDrive/Desktop/hacking%20tools/malware/RAMP/docs/DEPLOYMENT.md)

4. **Clean Reinstall**:
   ```powershell
   # Delete all build artifacts
   rmdir dist -Recurse -Force
   rmdir gui-controller\node_modules -Recurse -Force
   
   # Rebuild from scratch
   cd tools
   python ssl_gen.py
   
   cd ..\scripts
   .\build_agent.bat
   
   cd ..\gui-controller
   npm install
   ```

---

**Last Updated**: 2026-01-26  
**RAMP Version**: 1.0.0
