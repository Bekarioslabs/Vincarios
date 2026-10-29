'use strict';

const { pathToFileURL } = require('node:url');

const CLIPBOARD_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write', 'deprecated-sync-clipboard-read']);

function installApplicationGuards(electron, options) {
  const expectedUrl = pathToFileURL(options.appFilePath).href;
  const guardedSessions = new WeakSet();

  function allowsPermission(contents, permission, details) {
    try {
      const window = options.getWindow();
      return CLIPBOARD_PERMISSIONS.has(permission)
        && !!window && !window.isDestroyed() && window.webContents === contents
        && !!contents && !contents.isDestroyed() && contents.mainFrame.url === expectedUrl
        && !!details && details.isMainFrame === true && details.requestingUrl === expectedUrl;
    } catch (_error) {
      return false;
    }
  }

  electron.app.on('web-contents-created', (_event, contents) => {
    const denyNavigation = (event) => event.preventDefault();
    contents.on('will-navigate', denyNavigation);
    contents.on('will-frame-navigate', denyNavigation);
    contents.on('will-attach-webview', denyNavigation);
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));

    const session = contents.session;
    if (guardedSessions.has(session)) return;
    session.setPermissionCheckHandler((source, permission, _origin, details) => allowsPermission(source, permission, details));
    session.setPermissionRequestHandler((source, permission, callback, details) => callback(allowsPermission(source, permission, details)));
    guardedSessions.add(session);
  });
}

module.exports = { installApplicationGuards };
