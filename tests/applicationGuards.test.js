'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { installApplicationGuards } = require('../src/main/app/applicationGuards');

function fixture() {
  const app = new EventEmitter();
  const file = path.resolve('fixture shell #1/index.html');
  const url = pathToFileURL(file).href;
  const session = {
    setPermissionCheckHandler(fn) { this.check = fn; },
    setPermissionRequestHandler(fn) { this.request = fn; }
  };
  function contents() {
    return Object.assign(new EventEmitter(), { session, mainFrame: { url }, isDestroyed: () => false,
      setWindowOpenHandler(fn) { this.open = fn; } });
  }
  const main = contents();
  let window = { webContents: main, isDestroyed: () => false };
  installApplicationGuards({ app }, { appFilePath: file, getWindow: () => window });
  app.emit('web-contents-created', {}, main);
  return { app, main, session, contents, url, setWindow(value) { window = value; } };
}

test('global guards cover each new contents before load and retain session policy once', () => {
  const f = fixture();
  const handler = f.session.check;
  const other = f.contents();
  f.app.emit('web-contents-created', {}, other);
  assert.equal(f.session.check, handler);
  for (const contents of [f.main, other]) {
    for (const event of ['will-navigate', 'will-frame-navigate', 'will-attach-webview']) {
      let denied = false;
      contents.emit(event, { preventDefault() { denied = true; } });
      assert.equal(denied, true, event);
    }
    assert.deepEqual(contents.open({ url: 'https://example.com' }), { action: 'deny' });
  }
});

test('clipboard checks and requests permit only the live current shell main frame', () => {
  const f = fixture();
  const details = { isMainFrame: true, requestingUrl: f.url };
  for (const permission of ['clipboard-read', 'clipboard-sanitized-write', 'deprecated-sync-clipboard-read']) {
    assert.equal(f.session.check(f.main, permission, 'file://', details), true);
    let allowed;
    f.session.request(f.main, permission, (value) => { allowed = value; }, details);
    assert.equal(allowed, true);
    assert.equal(f.session.check(f.main, permission, 'file://', { ...details, isMainFrame: false }), false);
    assert.equal(f.session.check(f.contents(), permission, 'file://', details), false);
    assert.equal(f.session.check(f.main, permission, 'file://', { ...details, requestingUrl: f.url + '?other' }), false);
  }
  for (const permission of ['media', 'notifications', 'geolocation', 'unknown', 'fileSystem', 'fullscreen']) {
    assert.equal(f.session.check(f.main, permission, 'file://', details), false);
  }
  assert.equal(f.session.check(null, 'clipboard-read', 'file://', details), false);
  assert.equal(f.session.check(f.main, 'clipboard-read', 'file://', {}), false);
  f.setWindow(null);
  assert.equal(f.session.check(f.main, 'clipboard-read', 'file://', details), false);
});

test('navigation away, destroyed contents or a replaced window revoke clipboard access', () => {
  const f = fixture();
  const details = { isMainFrame: true, requestingUrl: f.url };
  f.main.mainFrame.url = 'about:blank';
  assert.equal(f.session.check(f.main, 'clipboard-read', 'file://', details), false);
  f.main.mainFrame.url = f.url;
  f.main.isDestroyed = () => true;
  assert.equal(f.session.check(f.main, 'clipboard-read', 'file://', details), false);
  f.setWindow({ webContents: f.contents(), isDestroyed: () => false });
  assert.equal(f.session.check(f.main, 'clipboard-read', 'file://', details), false);
});
