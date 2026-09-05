const { contextBridge } = require('electron');

/**
 * Minimal preload script adhering to ALCO security principles:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - No wide Node API exposure
 * - Exposes safe desktop metadata to window.alcoDesktop
 */
contextBridge.exposeInMainWorld('alcoDesktop', {
  isDesktop: true,
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
