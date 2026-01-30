# 🦅 RAMP User Manual

**RAMP (Remote Access Management Platform)** is a modern, modular Command & Control (C2) framework designed for Red Team operations.

---

## 🚀 1. Installation & Quick Start

### Prerequisites
- **Controller Machine**: Windows/Linux/Mac with Node.js & Python installed.
- **Victim Machine**: Windows (Target).

### Setup
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Gamermaan/RAMT.git --branch release/v1.0.3
    cd RAMT
    ```
2.  **Start C2 Server** (The Brain):
    ```bash
    cd c2-server
    pip install -r requirements.txt
    python app.py
    ```
3.  **Start GUI** (The Interface):
    ```bash
    cd gui-controller
    npm install
    npm start
    ```
4.  **compile & Run Agent** (The Implant):
    ```bash
    cd agent
    go build -o agent.exe
    ./agent.exe
    ```

---

## 💻 2. Dashboard Overview

### **Agents List**
- Shows all connected victims.
- **Status**: 🟢 (Online), 🔴 (Offline), 🟡 (Jitter/Sleep).
- **ID**: Validated unique identifier.
- **OS/IP**: Basic reconnaissance info.
- **Select**: Clickening an agent row selects it as the *Active Target* for Arsenal/Terminal.

### **Terminal (Command & Control)**
- **Standard Shell**: Type commands (`dir`, `whoami`) and get output.
- **Burst Mode** (⚡): Toggle this to execute commands instantly without waiting.
- **Clear**: Wipes the terminal history.

---

## 🛠️ 3. The Arsenal (Modules)

The Arsenal tab contains advanced post-exploitation modules. Select an agent first!

### **👻 Fileless Execution**
Run scripts directly in memory.
- **PowerShell / Bash / Python**: Write code or drag & drop `.ps1`/`.sh` files.
- **Execution**: The script runs in RAM. No file is dropped to disk.

### **🎭 Chaos Mode (Pranks & disruption)**
*Mess with the victim's session.*
- **🔔 Show Alert**: Display a custom error message (System Modal).
- **♾️ Spam Alerts**: Flood the screen with infinite popup loops.
- **🔗 Open URL**: Force open a website (Rickroll).
- **🚫 Block Screen**: **Lock the screen** with a "SYSTEM LOCKDOWN" overlay. Victim cannot close it.
- **☠️ Persist**: Add the prank to Registry Run keys so it starts on reboot.
- **Clean Up**: Use "Stop Spam" or "Unlock Screen" to kill the processes.

### **🛡️ Disable AV (Evasion)**
*Attempt to blind Windows Defender.*
- **Action**: Disables Real-time Monitoring, Cloud Protection, and Script Scanning.
- **Requirement**: Agent must be **Administrator**.

### **⬆️ Silent Admin Elevation**
*Get High Privileges.*
- **Automatic**: On startup, the Agent attempts to escalate.
- **Silent**: It triggers a standard Windows "Run as Administrator" prompt.
    - If User clicks **Yes**: Agent restarts as Admin (unlocks "Disable AV").
    - If User clicks **No**: Agent continues silently as User (no crash).

---

## 🏗️ 4. Payload Builder (GUI)
*Easily create custom agents without touching the command line.*

Navigate to the **Builder** tab in the GUI to generate new implants.

**Configuration Options:**
- **Target Platform**: Windows (`.exe`), Linux (Binary), or macOS.
- **C2 Server**: The IP/URL your agent connects to (e.g., `192.168.1.50:8443` or `https://my-c2.com`).
- **Sleep & Jitter**: Control how often the agent checks in (Stealth).
- **Persistence**: Auto-start on reboot (Registry Run Key).
- **Evasion**: Enable checks for Virtual Machines/Debuggers.

**Process:**
1.  Fill in the details.
2.  Click **🔨 Build Agent**.
3.  The compiled binary will be saved to the `dist/` folder in your project root.

---

## ☁️ 5. Deployment Manager
Manage where your C2 server runs.
- **Local**: Development mode (Localhost).
- **Cloud**: Supports deploying to VPS or PaaS like Render.com.
- **Reconfiguring Agent**: When switching environments, rebuild the agent:
  `go build -ldflags "-X main.embeddedC2Server=http://YOUR_IP:8443"`

---

## 🔜 6. Roadmap (Coming Soon)

We are actively building Phase 7 (Post-Exploitation) and Phase 8 (Spyware).

1.  **Browser Credential Stealer** 🕵️
    *   Extract saved passwords/cookies from Chrome & Edge.
2.  **Keylogger & Screenshot** 📸
    *   Live surveillance of user activity.
3.  **Dynamic Compilation** 🧬
    *   Server compiles a unique Agent binary for *each download* to bypass AV signatures.
4.  **SOCKS5 Proxy** 🌐
    *   Tunnel traffic through the victim's network.

---

*Disclailmer: RAMP is for educational and authorized testing purposes only.*
