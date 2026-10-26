'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');
const { applyWindowZoom } = require('./windowZoom');

const REPOSITORY_URL = 'https://github.com/Bekarioslabs/Vincarios';

function createApplicationMenu(options) {
  options = options || {};
  const onZoom = typeof options.onZoom === 'function' ? options.onZoom : function noop() {};
  const onNavigate = typeof options.onNavigate === 'function' ? options.onNavigate : function noop() {};
  const onOpenExternal = typeof options.onOpenExternal === 'function' ? options.onOpenExternal : function noop() {};
  return [
    { role: 'fileMenu' },
    { role: 'editMenu' },
    createNavigateMenu(onNavigate),
    {
      label: 'View',
      submenu: [
        ...(options.isPackaged === true ? [] : [{ role: 'reload' }, { role: 'forceReload' }]),
        { role: 'toggleDevTools' },
        { type: 'separator' },
        createZoomMenuItem('Reset Zoom', 'CommandOrControl+0', 'reset', onZoom),
        createZoomMenuItem('Zoom In', 'CommandOrControl+Plus', 'in', onZoom),
        createZoomMenuItem('Zoom Out', 'CommandOrControl+-', 'out', onZoom),
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Repository',
          click() {
            onOpenExternal(REPOSITORY_URL);
          }
        }
      ]
    }
  ];
}

function createNavigateMenu(onNavigate) {
  return {
    label: 'Navigate',
    submenu: [
      createNavigateMenuItem('Home', 'CommandOrControl+Shift+H', 'home', onNavigate),
      createNavigateMenuItem('Search', 'CommandOrControl+F', 'search', onNavigate),
      createNavigateMenuItem('Suggestions', 'CommandOrControl+Shift+S', 'suggestions', onNavigate),
      createNavigateMenuItem('Review Basket', null, 'review', onNavigate),
      { type: 'separator' },
      createNavigateMenuItem('Settings', 'CommandOrControl+,', 'settings', onNavigate)
    ]
  };
}

function createNavigateMenuItem(label, accelerator, destination, onNavigate) {
  return {
    label,
    accelerator: accelerator || undefined,
    destination,
    click(_menuItem, focusedWindow) {
      onNavigate(focusedWindow, destination);
    }
  };
}

function createZoomMenuItem(label, accelerator, zoomCommand, onZoom) {
  return {
    label,
    accelerator,
    zoomCommand,
    click(_menuItem, focusedWindow) {
      onZoom(focusedWindow, zoomCommand);
    }
  };
}

function installApplicationMenu(electron) {
  if (!electron || !electron.Menu || typeof electron.Menu.buildFromTemplate !== 'function' || typeof electron.Menu.setApplicationMenu !== 'function') return false;
  const onNavigate = (window, destination) => {
    if (!window || !window.webContents || typeof window.webContents.send !== 'function') return;
    window.webContents.send(IPC_CHANNELS.APP_MENU_NAVIGATE, destination);
  };
  const onOpenExternal = (url) => {
    if (!electron.shell || typeof electron.shell.openExternal !== 'function') return;
    electron.shell.openExternal(url);
  };
  electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate(createApplicationMenu({
    isPackaged: electron.app && electron.app.isPackaged === true,
    onZoom: applyWindowZoom,
    onNavigate,
    onOpenExternal
  })));
  return true;
}

module.exports = {
  REPOSITORY_URL,
  createApplicationMenu,
  installApplicationMenu
};
