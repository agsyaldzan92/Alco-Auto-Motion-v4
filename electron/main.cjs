const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const child_process = require('child_process');
const fs = require('fs');

// Global references
let mainWindow = null;
let serverProcess = null;
let serverPort = Number(process.env.PORT) || 3000;
let serverLogs = [];
const MAX_LOG_LINES = 50;

/**
 * Log collector for diagnostics
 */
function appendServerLog(data) {
  const text = data.toString();
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim()) {
      serverLogs.push(`[${new Date().toLocaleTimeString()}] ${line.trim()}`);
      if (serverLogs.length > MAX_LOG_LINES) {
        serverLogs.shift();
      }
    }
  }
}

/**
 * Check if a port is in use or available
 */
function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(false)).close();
      })
      .listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from defaultPort
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 50) {
    const inUse = await checkPortInUse(port);
    if (!inUse) {
      return port;
    }
    port++;
  }
  return startPort;
}

/**
 * Query /api/health to verify if server is alive and responding
 */
function checkServerHealth(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: port,
        path: '/api/health',
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Poll server health until ready or timeout
 */
async function waitForServerHealth(port, maxAttempts = 30, intervalMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isHealthy = await checkServerHealth(port);
    if (isHealthy) {
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Resolve FFmpeg binaries location if bundled with the application
 */
function resolveBundledFfmpeg() {
  const isWin = process.platform === 'win32';
  const ffmpegExe = isWin ? 'ffmpeg.exe' : 'ffmpeg';
  const ffprobeExe = isWin ? 'ffprobe.exe' : 'ffprobe';

  const possibleDirs = [
    path.join(process.resourcesPath, 'ffmpeg'),
    path.join(app.getAppPath(), 'resources', 'ffmpeg'),
    path.join(__dirname, '..', 'resources', 'ffmpeg'),
  ];

  for (const dir of possibleDirs) {
    const ffmpegPath = path.join(dir, ffmpegExe);
    const ffprobePath = path.join(dir, ffprobeExe);
    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
      return { ffmpegPath, ffprobePath };
    }
  }

  return null;
}

/**
 * Resolve path to the compiled server script
 */
function resolveServerScript() {
  const candidates = [
    path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'server.cjs'),
    path.join(app.getAppPath(), 'dist', 'server.cjs'),
    path.join(__dirname, '..', 'dist', 'server.cjs'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[candidates.length - 1];
}

/**
 * Start the local Express server child process
 */
async function startLocalServer() {
  // If a server is already running and healthy on target port (e.g. dev server), reuse it
  const alreadyHealthy = await checkServerHealth(serverPort);
  if (alreadyHealthy) {
    console.log(`[Electron] Reusing existing healthy server on 127.0.0.1:${serverPort}`);
    return true;
  }

  // Find an available port if default port is in use by another app
  const portInUse = await checkPortInUse(serverPort);
  if (portInUse) {
    serverPort = await findAvailablePort(serverPort + 1);
    console.log(`[Electron] Port 3000 busy; switching to port ${serverPort}`);
  }

  const serverScript = resolveServerScript();
  if (!fs.existsSync(serverScript)) {
    appendServerLog(`Server script not found at: ${serverScript}`);
    return false;
  }

  const env = {
    ...process.env,
    PORT: String(serverPort),
    HOST: '127.0.0.1',
    NODE_ENV: app.isPackaged ? 'production' : (process.env.NODE_ENV || 'production'),
  };

  // Configure bundled FFmpeg paths if available
  const bundledFfmpeg = resolveBundledFfmpeg();
  if (bundledFfmpeg) {
    env.FFMPEG_PATH = bundledFfmpeg.ffmpegPath;
    env.FFPROBE_PATH = bundledFfmpeg.ffprobePath;
    console.log(`[Electron] Using bundled FFmpeg: ${bundledFfmpeg.ffmpegPath}`);
  }

  console.log(`[Electron] Spawning server process: ${serverScript} on port ${serverPort}`);

  try {
    serverProcess = child_process.fork(serverScript, [], {
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: app.isPackaged ? process.resourcesPath : path.join(__dirname, '..'),
    });

    if (serverProcess.stdout) {
      serverProcess.stdout.on('data', appendServerLog);
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', appendServerLog);
    }

    serverProcess.on('error', (err) => {
      appendServerLog(`Server process error: ${err.message}`);
    });

    serverProcess.on('exit', (code, signal) => {
      appendServerLog(`Server process exited with code ${code}, signal ${signal}`);
      serverProcess = null;
    });

    // Wait for health check
    const isReady = await waitForServerHealth(serverPort, 30, 500);
    return isReady;
  } catch (err) {
    appendServerLog(`Failed to fork server: ${err.message}`);
    return false;
  }
}

/**
 * Kill the server child process cleanly
 */
function cleanupServerProcess() {
  if (serverProcess) {
    try {
      console.log('[Electron] Terminating local server process...');
      serverProcess.kill('SIGTERM');
      const procRef = serverProcess;
      setTimeout(() => {
        try {
          if (procRef && !procRef.killed) {
            procRef.kill('SIGKILL');
          }
        } catch (_) {}
      }, 2000);
    } catch (e) {
      console.error('[Electron] Error killing server:', e);
    }
    serverProcess = null;
  }
}

/**
 * Render clean error screen when server fails to start
 */
function renderErrorHtml(port, errorDetail, logs) {
  const escapedLogs = (logs || [])
    .slice(-15)
    .map((l) => l.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .join('\n');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>ALCO Auto Motion - Server Error</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0b0f19;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 16px;
      max-width: 620px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 8px;
    }
    p.desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .meta {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-label { color: #64748b; font-size: 11px; font-weight: 600; }
    .meta-val { color: #e2e8f0; font-family: monospace; font-weight: 700; }
    .logs-box {
      background: #030712;
      border: 1px solid #1f2937;
      border-radius: 10px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #cbd5e1;
      max-height: 160px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin-bottom: 24px;
    }
    .btn-group {
      display: flex;
      gap: 12px;
    }
    .btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .btn-secondary:hover {
      background: #334155;
      color: #ffffff;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Local Server Error</div>
    <h1>ALCO Auto Motion Gagal Memulai Server</h1>
    <p class="desc">
      Aplikasi desktop membutuhkan local Express server untuk menjalankan render native FFmpeg, analisis AI, dan streaming video. Server pada port <strong>${port}</strong> tidak merespons health check.
    </p>

    <div class="meta">
      <div class="meta-item">
        <span class="meta-label">Target Port</span>
        <span class="meta-val">${port}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <span class="meta-val" style="color: #f87171;">HEALTH_CHECK_FAILED</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Mode</span>
        <span class="meta-val">${process.env.NODE_ENV || 'production'}</span>
      </div>
    </div>

    ${escapedLogs ? `<div class="logs-box">${escapedLogs}</div>` : ''}

    <div class="btn-group">
      <a href="alco-action://retry" class="btn btn-primary">Coba Lagi</a>
      <a href="alco-action://close" class="btn btn-secondary">Tutup Aplikasi</a>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Create and configure BrowserWindow
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: '#0b0f19',
    title: 'ALCO Auto Motion',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Intercept navigation for error screen buttons (retry/close)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('alco-action://retry')) {
      event.preventDefault();
      startServerAndLoad();
    } else if (url.startsWith('alco-action://close')) {
      event.preventDefault();
      app.quit();
    }
  });

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Startup orchestrator: launch server and load into browser window
 */
async function startServerAndLoad() {
  if (!mainWindow) {
    createMainWindow();
  }

  const isServerReady = await startLocalServer();

  if (isServerReady) {
    const appUrl = `http://127.0.0.1:${serverPort}`;
    console.log(`[Electron] Loading application URL: ${appUrl}`);
    mainWindow.loadURL(appUrl);
  } else {
    console.error(`[Electron] Server failed to start on 127.0.0.1:${serverPort}`);
    const errorHtml = renderErrorHtml(serverPort, 'Health check failed', serverLogs);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    createMainWindow();
    await startServerAndLoad();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        startServerAndLoad();
      }
    });
  });

  // Clean application termination
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      cleanupServerProcess();
      app.quit();
    }
  });

  app.on('before-quit', cleanupServerProcess);
  app.on('will-quit', cleanupServerProcess);

  process.on('exit', cleanupServerProcess);
  process.on('SIGINT', () => {
    cleanupServerProcess();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupServerProcess();
    process.exit(0);
  });
}
