'use strict';

const { pathToFileURL } = require('node:url');

function safeHandle(ipcMain, channel, handler, options) {
  options = options || {};
  if (typeof handler !== 'function') throw new TypeError('IPC handler is required.');
  const isTrustedSender = options.isTrustedSender;
  const reportError = typeof options.reportError === 'function' ? options.reportError : (report) => {
    console.error('IPC request failed:', report.channel, report.code);
  };
  ipcMain.handle(channel, async (event, ...args) => {
    let trusted = false;
    try {
      trusted = typeof isTrustedSender === 'function' && isTrustedSender(event) === true;
    } catch (_error) {
      trusted = false;
    }
    if (!trusted) return { ok: false, code: 'ipc_sender_not_allowed', message: 'This request is not allowed from this window.' };
    try {
      return await handler(event, ...args);
    } catch (_error) {
      try { await reportError({ channel, code: 'ipc_request_failed' }); } catch (_reportError) {}
      return { ok: false, code: 'ipc_request_failed', message: 'The request could not be completed. Try again or restart Vincarios.' };
    }
  });
}

function createSafeIpcMain(ipcMain, options) {
  return Object.freeze({ handle: (channel, handler) => safeHandle(ipcMain, channel, handler, options) });
}

function createTrustedSender(options) {
  const expectedUrl = pathToFileURL(options.appFilePath).href;
  return (event) => {
    try {
      const window = options.getWindow();
      if (!window || window.isDestroyed() || !event) return false;
      const contents = window.webContents;
      return !!contents && !contents.isDestroyed()
        && event.sender === contents
        && !!event.senderFrame
        && event.senderFrame === contents.mainFrame
        && event.senderFrame.url === expectedUrl;
    } catch (_error) {
      return false;
    }
  };
}

module.exports = { safeHandle, createSafeIpcMain, createTrustedSender };
