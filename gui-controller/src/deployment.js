/*
 * RAMP GUI Controller - Deployment Module
 * Handles local and cloud C2 server deployment
 */

// Node.js modules for local server control
const { spawn } = require('child_process');
const path = require('path');

// Deployment state
let localServerProcess = null;

// Crypto module - conditionally loaded
let crypto = null;

if (typeof require !== 'undefined') {
    try {
        crypto = require('crypto');
    } catch (e) {
        console.warn('[DEPLOYMENT] Running in browser mode, some features disabled');
    }
}

// Initialize deployment tab - will be called from renderer.js
function initDeployment() {
    console.log('[DEPLOYMENT] ==================== Initializing Deployment Module ====================');
    console.log('[DEPLOYMENT] Checking for deployment view element...');

    const deploymentView = document.getElementById('deploymentView');
    if (!deploymentView) {
        console.error('[DEPLOYMENT] ERROR: deploymentView element not found in DOM!');
        return;
    }
    console.log('[DEPLOYMENT] ✓ deploymentView found');

    try {
        console.log('[DEPLOYMENT] Setting up tab switching...');
        setupTabSwitching();

        console.log('[DEPLOYMENT] Setting up local deployment...');
        setupLocalDeployment();

        console.log('[DEPLOYMENT] Setting up cloud deployment...');
        setupCloudDeployment();

        console.log('[DEPLOYMENT] Loading deployment config...');
        loadDeploymentConfig();

        console.log('[DEPLOYMENT] ✓✓✓ Deployment module initialized successfully ✓✓✓');
    } catch (error) {
        console.error('[DEPLOYMENT] ERROR during initialization:', error);
    }
}

// Tab switching logic
function setupTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    console.log(`[DEPLOYMENT] Found ${tabBtns.length} tab buttons`);

    if (tabBtns.length === 0) {
        console.warn('[DEPLOYMENT] WARNING: No deployment tab buttons found');
        return;
    }

    tabBtns.forEach((btn, index) => {
        console.log(`[DEPLOYMENT] Adding listener to tab button ${index}: ${btn.dataset.tab}`);
        btn.addEventListener('click', () => {
            console.log(`[DEPLOYMENT] Tab clicked: ${btn.dataset.tab}`);

            if (btn.classList.contains('deployment-locked')) {
                console.log('[DEPLOYMENT] Tab is locked (premium feature)');
                showNotification('Locked', 'Premium features coming soon!');
                return;
            }

            const tabName = btn.dataset.tab;
            console.log(`[DEPLOYMENT] Switching to tab: ${tabName}`);

            // Update tab buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetTab = document.getElementById(`tab-${tabName}`);
            if (targetTab) {
                targetTab.classList.add('active');
                console.log(`[DEPLOYMENT] ✓ Activated tab content: tab-${tabName}`);
            } else {
                console.error(`[DEPLOYMENT] ERROR: Could not find tab content element: tab-${tabName}`);
            }
        });
    });
    console.log('[DEPLOYMENT] ✓ Tab switching setup complete');
}

// Local server deployment
function setupLocalDeployment() {
    const startBtn = document.getElementById('start-local-server');
    const stopBtn = document.getElementById('stop-local-server');
    const advancedBtn = document.getElementById('local-advanced');

    console.log('[DEPLOYMENT] Local deployment buttons:', {
        startBtn: !!startBtn,
        stopBtn: !!stopBtn,
        advancedBtn: !!advancedBtn
    });

    if (!startBtn || !stopBtn || !advancedBtn) {
        console.warn('[DEPLOYMENT] WARNING: Some local deployment buttons not found');
        return;
    }

    startBtn.addEventListener('click', startLocalServer);
    stopBtn.addEventListener('click', stopLocalServer);
    advancedBtn.addEventListener('click', showAdvancedConfig);
}

function startLocalServer() {
    const port = document.getElementById('local-port').value;
    const password = document.getElementById('local-password').value;

    const projectRoot = path.join(__dirname, '../..');
    const serverPath = path.join(projectRoot, 'c2-server', 'app.py');

    // Set environment variables
    const env = {
        ...process.env,
        DEPLOYMENT_MODE: 'local',
        C2_HOST: '0.0.0.0',
        C2_PORT: port,
        C2_URL: `https://localhost:${port}`,
        ADMIN_PASSWORD: password
    };

    // Start server
    localServerProcess = spawn('python', [serverPath], {
        cwd: path.join(projectRoot, 'c2-server'),
        env: env
    });

    // Update UI
    document.getElementById('local-server-status').innerHTML = '🟡 Starting...';
    document.getElementById('start-local-server').disabled = true;
    document.getElementById('local-logs').style.display = 'block';

    // Handle output
    localServerProcess.stdout.on('data', (data) => {
        const logOutput = document.getElementById('local-log-output');
        logOutput.innerHTML += `${data.toString()}<br>`;
        logOutput.scrollTop = logOutput.scrollHeight;

        // Strip ANSI color codes for detection
        const cleanOutput = data.toString().replace(/\x1b\[[0-9;]*m/g, '');

        // Check if started successfully - look for "Running on" or "Running on all addresses"
        if (cleanOutput.includes('Running on') || cleanOutput.includes('Serving Flask app')) {
            document.getElementById('local-server-status').innerHTML = `🟢 Running on localhost:${port}`;
            document.getElementById('stop-local-server').disabled = false;
            document.getElementById('start-local-server').disabled = true;
            showNotification('Success', `C2 Server running on port ${port}`);

            // Save running config
            saveDeploymentConfig({
                local: { port, status: 'running' }
            });
        }
    });

    localServerProcess.stderr.on('data', (data) => {
        const logOutput = document.getElementById('local-log-output');
        logOutput.innerHTML += `<span style="color:#ff6b6b">${data.toString()}</span><br>`;
        logOutput.scrollTop = logOutput.scrollHeight;
    });

    localServerProcess.on('close', (code) => {
        document.getElementById('local-server-status').innerHTML = '🔴 Not Running';
        document.getElementById('start-local-server').disabled = false;
        document.getElementById('stop-local-server').disabled = true;

        saveDeploymentConfig({
            local: { port, status: 'stopped' }
        });
    });

    logActivity(`Starting local C2 server on port ${port}`);
}

function stopLocalServer() {
    if (localServerProcess) {
        localServerProcess.kill();
        localServerProcess = null;
        logActivity('Stopped local C2 server');
        showNotification('Info', 'Server stopped');
    }
}

// Cloud deployment
function setupCloudDeployment() {
    const deployBtn = document.getElementById('deploy-to-cloud');
    const generateBtn = document.getElementById('generate-password');
    const advancedBtn = document.getElementById('cloud-advanced');

    if (!deployBtn || !generateBtn || !advancedBtn) {
        console.warn('Cloud deployment buttons not found');
        return;
    }

    deployBtn.addEventListener('click', deployToCloud);
    generateBtn.addEventListener('click', () => {
        const password = generateSecurePassword();
        document.getElementById('cloud-password').value = password;
        showNotification('Generated', 'Secure password generated!');
    });
    advancedBtn.addEventListener('click', showAdvancedConfig);

    // Platform card selection
    const platformCards = document.querySelectorAll('.platform-card');
    platformCards.forEach(card => {
        card.addEventListener('click', () => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
            }
        });
    });
}

function deployToCloud() {
    const platform = document.querySelector('input[name="cloud-platform"]:checked').value;
    const appName = document.getElementById('cloud-app-name').value || 'ramp-c2';
    const password = document.getElementById('cloud-password').value || generateSecurePassword();

    showNotification('Info', `Deploying to ${platform}... (This feature requires additional setup)`);

    // Show deployment instructions based on platform
    const instructions = getDeploymentInstructions(platform, appName, password);
    showDeploymentInstructions(instructions);

    logActivity(`Initiated deployment to ${platform}`);
}

function getDeploymentInstructions(platform, appName, password) {
    const baseInstructions = {
        render: {
            title: 'Deploy to Render.com',
            steps: [
                '1. Push your code to GitHub',
                '2. Go to https://dashboard.render.com',
                '3. Click "New +" → "Web Service"',
                '4. Connect your GitHub repository',
                `5. Set environment variables:`,
                `   - DEPLOYMENT_MODE=internet`,
                `   - ADMIN_PASSWORD=${password}`,
                `   - JWT_SECRET_KEY=<generate random>`,
                '6. Click "Create Web Service"',
                '7. Wait for deployment (~2-3 minutes)',
                '8. Copy the URL and connect your GUI!'
            ],
            docs: 'https://render.com/docs'
        },
        railway: {
            title: 'Deploy to Railway.app',
            steps: [
                '1. Push your code to GitHub',
                '2. Go to https://railway.app',
                '3. Click "New Project" → "Deploy from GitHub"',
                '4. Select your repository',
                `5. Add environment variables in Settings`,
                `6. Set start command: python c2-server/app.py`,
                '7. Deploy!',
                '8. Find your URL in Deployments tab'
            ],
            docs: 'https://docs.railway.app'
        },
        fly: {
            title: 'Deploy to Fly.io',
            steps: [
                '1. Install flyctl: https://fly.io/docs/hands-on/install-flyctl/',
                '2. Login: flyctl auth login',
                '3. Navigate to RAMP directory',
                '4. Run: flyctl launch',
                '5. Follow the prompts',
                '6. Deploy: flyctl deploy',
                '7. Get URL: flyctl info'
            ],
            docs: 'https://fly.io/docs'
        }
    };

    return baseInstructions[platform];
}

function showDeploymentInstructions(instructions) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${instructions.title}</h2>
            <div class="instructions">
                ${instructions.steps.map(step => `<p>${step}</p>`).join('')}
            </div>
            <p><a href="${instructions.docs}" target="_blank">📖 View Documentation</a></p>
            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Got it!</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// Utility functions
function generateSecurePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }

    return password;
}

function showAdvancedConfig() {
    showNotification('Coming Soon', 'Advanced configuration panel will be available in the next update!');
}

function saveDeploymentConfig(config) {
    const existing = JSON.parse(localStorage.getItem('rampDeployments') || '{}');
    const updated = { ...existing, ...config };
    localStorage.setItem('rampDeployments', JSON.stringify(updated));
}

function loadDeploymentConfig() {
    const config = JSON.parse(localStorage.getItem('rampDeployments') || '{}');

    if (config.local) {
        document.getElementById('local-port').value = config.local.port || 8443;
        if (config.local.status === 'running') {
            // Note: Server won't actually be running after restart
            document.getElementById('local-server-status').innerHTML = '🔴 Not Running (restart required)';
        }
    }
}

// Export for use in renderer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initDeployment,
        startLocalServer,
        stopLocalServer,
        deployToCloud
    };
}
