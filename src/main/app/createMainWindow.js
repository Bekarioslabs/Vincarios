'use strict';

const path = require('node:path');
const { DEFAULT_THEME_COLORS } = require('../../shared/ui/themeDefaults');
const { installApplicationMenu } = require('./createApplicationMenu');
const { wireWindowZoomShortcuts } = require('./windowZoom');

function createWindowOptions(projectRoot) {
  return {
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: true,
    backgroundColor: DEFAULT_THEME_COLORS.backgroundPrimary,
    webPreferences: {
      preload: path.join(projectRoot, 'src', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  };
}

function createMainWindow(electron, options) {
  options = options || {};
  const { BrowserWindow } = electron;
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');

  installApplicationMenu(electron);
  const win = new BrowserWindow(createWindowOptions(projectRoot));
  wireWindowZoomShortcuts(win);

  // The only renderer is the packaged local shell; links use the explicit IPC browser flow.
  win.webContents.on('will-navigate', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('vitruvios window failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('vitruvios preload failed:', preloadPath, error);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('vitruvios renderer process gone:', details);
  });

  win.loadFile(path.join(projectRoot, 'index.html')).catch((error) => {
    console.error('vitruvios loadFile failed:', error);
  });

  return win;
}

module.exports = {
  createWindowOptions,
  createMainWindow
};
