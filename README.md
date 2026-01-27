# RAMP - Remote Access Management Protocol

A modular, scalable remote management framework designed for professional system administration and security research.

## ⚠️ Legal Notice

**This tool is intended for legitimate system administration, security research, and educational purposes only.**

You must:
- Only use on systems you own or have explicit written authorization to manage
- Comply with all applicable local, state, and federal laws
- Not use for unauthorized access or malicious purposes

Unauthorized computer access is illegal under the Computer Fraud and Abuse Act (CFAA) and similar laws worldwide.

## 🎯 Features

### Cross-Platform Agent (Go)
- ✅ Secure HTTPS communication with certificate pinning
- ✅ Cross-platform support (Windows, Linux, macOS)
- ✅ Command execution with output capture
- ✅ Secure file transfer (AES-256 encryption)
- ✅ Configurable persistence mechanisms
- ✅ Environment detection (VM/sandbox awareness)

### C2 Server (Python Flask + React)
- ✅ RESTful API with JWT authentication
- ✅ Redis-based task queue for scalability
- ✅ SQLite database for session management
- ✅ Real-time web dashboard
- ✅ Agent heartbeat monitoring
- ✅ TLS 1.3 enforcement

### Web Dashboard (React)
- ✅ Real-time agent location map (Leaflet.js)
- ✅ Interactive terminal emulator (XTerm.js)
- ✅ Drag-and-drop file manager
- ✅ Modern, responsive UI

### GUI Controller (Electron)
- ✅ Cross-platform desktop application
- ✅ Connection profile management
- ✅ Terminal emulator with ANSI support
- ✅ Payload generator with obfuscation
- ✅ Plugin system (SSL cert gen, APK signer)

## 📁 Project Structure

```
RAMP/
├── agent/                  # Go-based agent
│   ├── main.go
│   ├── config/
│   ├── comm/              # Communication module
│   ├── exec/              # Command execution
│   ├── transfer/          # File transfer
│   ├── persist/           # Persistence mechanisms
│   └── evasion/           # Detection evasion
├── c2-server/             # Python Flask C2 server
│   ├── app.py
│   ├── auth.py
│   ├── database.py
│   ├── tasks.py
│   ├── dashboard/         # React frontend
│   └── Dockerfile
├── gui-controller/        # Electron GUI
│   ├── main.js
│   ├── src/
│   └── plugins/
├── tools/                 # Standalone tools
│   ├── ssl_gen.py
│   └── apk_signer.py
├── docs/                  # Documentation
├── scripts/               # Build scripts
└── tests/                 # Test suite
```

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- Python 3.11+
- Node.js 18+
- Redis
- Docker (optional)

### 1. Build the Agent
```bash
cd agent
go mod download
go build -o agent.exe
```

### 2. Start the C2 Server
```bash
cd c2-server
pip install -r requirements.txt
python app.py
```

### 3. Launch the GUI Controller
```bash
cd gui-controller
npm install
npm start
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and components
- [Deployment](docs/DEPLOYMENT.md) - Production deployment guide
- [API Reference](docs/API.md) - C2 server API documentation

## 🔒 Security Features

- TLS 1.3 with certificate pinning
- AES-256 encryption for file transfers
- JWT-based authentication
- IP whitelisting
- Secure credential storage
- No hardcoded secrets

## 🧪 Testing

```bash
# Run all tests
./scripts/test_all.sh

# Agent tests
cd agent && go test -v ./...

# C2 server tests
cd c2-server && pytest -v --cov

# Dashboard tests
cd c2-server/dashboard && npm run test:e2e
```

## 📦 Building for Production

```bash
# Cross-compile agents
./scripts/build_agent.sh

# Build Docker containers
docker-compose up -d
```

## 🤝 Contributing

This is a research project. Contributions should focus on:
- Security improvements
- Cross-platform compatibility
- Performance optimization
- Documentation

## 📄 License

This project is for educational and research purposes. See LICENSE for details.

## ⚡ Project Status

- ✅ Phase 1: Architecture Design (Complete)
- 🔄 Phase 2: Agent Development (In Progress)
- ⏳ Phase 3: C2 Server Development
- ⏳ Phase 4: GUI Controller Development
- ⏳ Phase 5: CI/CD Pipeline
- ⏳ Phase 6: Deployment & Monitoring
