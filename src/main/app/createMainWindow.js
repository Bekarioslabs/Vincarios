'use strict';

const path = require('node:path');

function createWindowOptions(projectRoot) {
  return {
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: '#111317',
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

  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadFile(path.join(projectRoot, 'index.html'));
  return win;
}

module.exports = {
  createWindowOptions,
  createMainWindow
};