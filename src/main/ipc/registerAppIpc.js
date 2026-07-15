'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerAppIpc(ipcMain, options) {
  options = options || {};
  const appName = options.appName || 'vitruvios';
  const version = options.version || '0.1.0';
  const shell = options.shell || null;

  ipcMain.handle(IPC_CHANNELS.APP_INFO, () => ({
    name: appName,
    version,
    localFirst: true,
    markdownFirst: true
  }));

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_EXTERNAL, (_event, url) => openExternalUrl(shell, url));
}

async function openExternalUrl(shell, url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return { ok: false, message: 'External URL is not allowed.' };
  if (!shell || typeof shell.openExternal !== 'function') return { ok: false, message: 'External browser service unavailable.' };
  await shell.openExternal(normalized);
  return { ok: true, url: normalized };
}

function normalizeExternalUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  let parsed;
  try {
    parsed = new URL(value);
  } catch (error) {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return parsed.href;
}

module.exports = {
  normalizeExternalUrl,
  openExternalUrl,
  registerAppIpc
};
