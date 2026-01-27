# RAMP Quick Start Guide - Windows

Complete setup guide for running RAMP on Windows.

## Prerequisites Installation

### 1. Install Python 3.11+
```powershell
# Download from: https://www.python.org/downloads/
# OR use winget:
winget install Python.Python.3.11

# Verify installation
python --version
```

### 2. Install Go 1.21+
```powershell
# Download from: https://go.dev/dl/
# OR use chocolatey:
choco install golang

# Verify installation
go version
```

### 3. Install Node.js 18+
```powershell
# Download from: https://nodejs.org/
# OR use winget:
winget install OpenJS.NodeJS

# Verify installation
node --version
npm --version
```

### 4. Install Redis (Optional, for production)
```powershell
# Download from: https://github.com/microsoftarchive/redis/releases
# OR use chocolatey:
choco install redis-64

# Start Redis service
redis-server
```

---

## Step 1: Generate SSL Certificates

```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\tools"

# Install cryptography library
pip install cryptography

# Generate certificates
python ssl_gen.py

# Output will be in: ..\c2-server\certs\
# SAVE THE FINGERPRINT displayed - you'll need it for agent config!
```

---

## Step 2: Start C2 Server

### Option A: Development Mode (Quick Start)

```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server"

# Install dependencies
pip install -r requirements.txt

# Set environment variables (PowerShell)
$env:ADMIN_PASSWORD = "your-secure-password"
$env:JWT_SECRET_KEY = "your-secret-key-here"

# Run the server
python app.py
```

The server will start on `https://localhost:8443`

### Option B: Production Mode with Gunicorn

```powershell
# Install gunicorn
pip install gunicorn

# Set environment variables
$env:ADMIN_PASSWORD = "your-secure-password"
$env:JWT_SECRET_KEY = "your-secret-key-here"

# Run with gunicorn (if on WSL)
# Note: Gunicorn doesn't work natively on Windows
# Use development mode or deploy on Linux/WSL
```

**For Windows, use Development Mode (Option A)**

---

## Step 3: Build Agents

```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\agent"

# Initialize Go modules
go mod download

# Build Windows agent (current platform)
go build -trimpath -ldflags="-s -w" -o ..\dist\ramp-agent-windows.exe .

# Build for all platforms using the script
cd ..\scripts
.\build_agent.bat
```

Agents will be in: `c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\dist\`

---

## Step 4: Configure and Run Agent

### Create Agent Config (Optional)

Create `c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\agent\config.json`:

```json
{
  "c2_server": "localhost:8443",
  "certificate_pin": "PASTE-SHA256-FINGERPRINT-HERE",
  "enable_persistence": false,
  "heartbeat_interval": 30
}
```

### Run Agent

```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\dist"

# Option 1: Interactive (will prompt for C2 server)
.\ramp-agent-windows.exe

# Option 2: Specify server via command line
.\ramp-agent-windows.exe --server localhost:8443

# Option 3: Use config file
.\ramp-agent-windows.exe --config ..\agent\config.json

# Option 4: Disable persistence for testing
.\ramp-agent-windows.exe --server localhost:8443 --no-persist
```

---

## Step 5: Run GUI Controller

```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\gui-controller"

# Install dependencies (first time only)
npm install

# Start the application
npm start
```

### In the GUI:
1. Enter C2 Server URL: `https://localhost:8443`
2. Click **Connect**
3. Go to **Agents** tab
4. You should see your agent listed!

---

## Complete Test Workflow

### Terminal 1: C2 Server
```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server"
$env:ADMIN_PASSWORD = "admin123"
python app.py
```

### Terminal 2: Agent
```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\dist"
.\ramp-agent-windows.exe --server localhost:8443 --no-persist
```

### Terminal 3: GUI Controller
```powershell
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\gui-controller"
npm start
```

---

## Testing Features

### 1. View Connected Agents
- Open GUI Controller
- Go to **Agents** tab
- Click **Refresh**
- You should see your agent

### 2. Send Commands
- Select an agent in the table
- Click **Command**
- Enter: `whoami`
- Check C2 server logs for execution

### 3. Use Terminal
- Go to **Terminal** tab
- Select agent from dropdown
- Type commands directly
- Press Enter to send

### 4. Test File Transfer
- Go to **Files** tab
- Select agent
- Enter local and remote file paths
- Click Upload/Download

---

## Troubleshooting

### Agent Won't Connect

**Check C2 Server is Running:**
```powershell
# Test health endpoint
curl.exe -k https://localhost:8443/health
```

**Check Firewall:**
```powershell
# Allow port 8443
netsh advfirewall firewall add rule name="RAMP C2" dir=in action=allow protocol=TCP localport=8443
```

**Check Agent Logs:**
The agent prints logs to console. Look for connection errors.

### SSL Certificate Errors

**Accept Self-Signed Certificate:**
- Browser/GUI will warn about self-signed cert
- This is normal for development
- Click "Accept" or "Proceed anyway"

**Verify Certificate Files Exist:**
```powershell
dir "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server\certs"
# Should show: server.crt and server.key
```

### GUI Controller Won't Start

**Clear npm cache:**
```powershell
cd gui-controller
npm cache clean --force
rmdir node_modules -Recurse -Force
npm install
```

**Check Node.js version:**
```powershell
node --version
# Should be v18 or higher
```

### Python Dependencies Issues

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies with verbose output
pip install -r requirements.txt --verbose
```

---

## Production Deployment Tips

### 1. Use Real Domain
- Get a domain name (e.g., from Namecheap, GoDaddy)
- Point to your Windows server IP
- Generate cert for that domain: `python ssl_gen.py --cn yourdomain.com`

### 2. Run C2 Server as Windows Service

Use **NSSM** (Non-Sucking Service Manager):
```powershell
# Download NSSM: https://nssm.cc/download
choco install nssm

# Install as service
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server"
nssm install RAMP-C2 "C:\Python311\python.exe" "app.py"
nssm set RAMP-C2 AppDirectory "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server"
nssm start RAMP-C2
```

### 3. Enable HTTPS on Port 443

```powershell
# Modify app.py to use port 443 instead of 8443
# Requires Admin privileges

# Run PowerShell as Administrator
python app.py
```

---

## Quick Commands Reference

**Start Everything (3 terminals):**

```powershell
# Terminal 1
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\c2-server"
$env:ADMIN_PASSWORD="admin123"; python app.py

# Terminal 2  
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\dist"
.\ramp-agent-windows.exe --server localhost:8443 --no-persist

# Terminal 3
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\gui-controller"
npm start
```

**Build Everything:**

```powershell
# Build agents
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\scripts"
.\build_agent.bat

# Build GUI (creates installer)
cd "c:\Users\Gurpartap\OneDrive\Desktop\hacking tools\malware\RAMP\gui-controller"
npm run build:win
```

---

## Security Reminders

⚠️ **For Testing Only:**
- `--no-persist` flag prevents agent from installing itself permanently
- Use strong passwords in production
- Never expose C2 server directly to internet without proper security

⚠️ **Legal Notice:**
- Only use on systems you own or have authorization to manage
- Unauthorized computer access is illegal
- This is for legitimate system administration only

---

## Next Steps

1. ✅ Test locally with all three components
2. ✅ Try sending commands through terminal
3. ✅ Test file transfer
4. ✅ Generate payloads for different platforms
5. 📖 Read [DEPLOYMENT.md](file:///c:/Users/Gurpartap/OneDrive/Desktop/hacking%20tools/malware/RAMP/docs/DEPLOYMENT.md) for production setup
6. 📖 Read [ARCHITECTURE.md](file:///c:/Users/Gurpartap/OneDrive/Desktop/hacking%20tools/malware/RAMP/docs/ARCHITECTURE.md) to understand the system

---

## Support

Having issues? Check:
1. All prerequisites are installed (Python, Go, Node.js)
2. SSL certificates are generated
3. No other services using port 8443
4. Firewall allows connections
5. All paths are correct for your system
