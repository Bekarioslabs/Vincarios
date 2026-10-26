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

  win.webContents.on('will-prevent-unload', (event) => {
    if (!electron.dialog || typeof electron.dialog.showMessageBoxSync !== 'function') return;
    try {
      const choice = electron.dialog.showMessageBoxSync(win, {
        type: 'warning',
        title: 'Unsaved local changes',
        message: 'Your current note has local changes that are not saved to the vault.',
        detail: 'Stay to keep editing or add the changes to Review Basket. Discard changes closes or reloads the window without saving the local editor draft.',
        buttons: ['Stay', 'Discard changes'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      });
      // Electron reverses the usual meaning: preventDefault allows this unload.
      if (choice === 1) event.preventDefault();
    } catch (_error) {
      console.error('Could not confirm window unload; local changes remain protected.');
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('vincarios window failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error('vincarios preload failed:', preloadPath, error);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('vincarios renderer process gone:', details);
  });

  win.loadFile(path.join(projectRoot, 'index.html')).catch((error) => {
    console.error('vincarios loadFile failed:', error);
  });

  return win;
}

module.exports = {
  createWindowOptions,
  createMainWindow
};
