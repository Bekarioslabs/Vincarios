'use strict';

const path = require('node:path');
const { DEFAULT_THEME_COLORS } = require('../../shared/ui/themeDefaults');

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

  const win = new BrowserWindow(createWindowOptions(projectRoot));

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Vitruvios window failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('Vitruvios preload failed:', preloadPath, error);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Vitruvios renderer process gone:', details);
  });

  win.loadFile(path.join(projectRoot, 'index.html')).catch((error) => {
    console.error('Vitruvios loadFile failed:', error);
  });

  return win;
}

module.exports = {
  createWindowOptions,
  createMainWindow
};
