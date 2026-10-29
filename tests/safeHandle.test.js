'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { safeHandle, createSafeIpcMain, createTrustedSender } = require('../src/main/ipc/safeHandle');

function fixture() {
  const appFilePath = path.resolve('fixture app', 'index.html');
  const frame = { url: pathToFileURL(appFilePath).href };
  const contents = { mainFrame: frame, isDestroyed: () => false };
  const window = { webContents: contents, isDestroyed: () => false };
  let activeWindow = window;
  const event = { sender: contents, senderFrame: frame };
  const isTrustedSender = createTrustedSender({ getWindow: () => activeWindow, appFilePath });
  return { event, frame, window, contents, isTrustedSender, setWindow(value) { activeWindow = value; } };
}

test('sender policy accepts only the current app window main frame at its exact file URL', () => {
  const f = fixture();
  assert.equal(f.isTrustedSender(f.event), true);
  for (const event of [null, {}, { sender: f.contents }, { sender: f.contents, senderFrame: null },
    { sender: {}, senderFrame: f.frame }, { sender: f.contents, senderFrame: { url: f.frame.url } }]) {
    assert.equal(f.isTrustedSender(event), false);
  }
  for (const url of ['about:blank', 'https://example.com', f.frame.url + '?other=1', f.frame.url.replace('index.html', 'other.html')]) {
    const original = f.frame.url;
    f.frame.url = url;
    assert.equal(f.isTrustedSender(f.event), false, url);
    f.frame.url = original;
  }
  f.contents.isDestroyed = () => true;
  assert.equal(f.isTrustedSender(f.event), false);
  f.contents.isDestroyed = () => false;
  f.window.isDestroyed = () => true;
  assert.equal(f.isTrustedSender(f.event), false);
  f.window.isDestroyed = () => false;
  f.setWindow(null);
  assert.equal(f.isTrustedSender(f.event), false);
  f.setWindow({ webContents: { mainFrame: f.frame }, isDestroyed: () => false });
  assert.equal(f.isTrustedSender(f.event), false);
});

test('sender-policy access failures deny requests instead of escaping', () => {
  const isTrusted = createTrustedSender({ getWindow() { throw new Error('Destroyed'); }, appFilePath: path.resolve('index.html') });
  assert.equal(isTrusted({}), false);
});

test('safe handler blocks untrusted or missing policy before touching the service', async () => {
  let callback;
  let calls = 0;
  const ipc = { handle(_channel, handler) { callback = handler; } };
  safeHandle(ipc, 'test:read', () => { calls += 1; });
  assert.deepEqual(await callback({}), { ok: false, code: 'ipc_sender_not_allowed', message: 'This request is not allowed from this window.' });
  safeHandle(ipc, 'test:read', () => { calls += 1; }, { isTrustedSender: () => ({ truthy: true }) });
  assert.equal((await callback({})).code, 'ipc_sender_not_allowed');
  safeHandle(ipc, 'test:read', () => { calls += 1; }, { isTrustedSender() { throw new Error('Private path'); } });
  assert.equal((await callback({})).code, 'ipc_sender_not_allowed');
  assert.equal(calls, 0);
});

test('safe facade preserves channel names, event, arguments, sync/async success and expected failures', async () => {
  const f = fixture();
  const handlers = new Map();
  const ipc = createSafeIpcMain({ handle: (channel, handler) => handlers.set(channel, handler) }, { isTrustedSender: f.isTrustedSender });
  const calls = [];
  for (const result of [{ ok: true, content: 'Fixture text' }, { ok: false, code: 'cancelled', message: 'Cancelled.' }, { ok: false, code: 'stale_content' }]) {
    ipc.handle('test:request', (event, payload, extra) => { calls.push([event, payload, extra]); return result; });
    const payload = { path: 'Fixture.md' };
    assert.equal(await handlers.get('test:request')(f.event, payload, 3), result);
    assert.deepEqual(calls.at(-1), [f.event, payload, 3]);
  }
  ipc.handle('test:async', async () => ({ name: 'App info without ok field' }));
  assert.deepEqual(await handlers.get('test:async')(f.event), { name: 'App info without ok field' });
  assert.deepEqual(Array.from(handlers.keys()), ['test:request', 'test:async']);
});

for (const asynchronous of [false, true]) {
  test('safe handler catches ' + (asynchronous ? 'async rejection' : 'sync exception') + ' without exposing errors or payloads', async () => {
    const f = fixture();
    let callback;
    const reports = [];
    const handler = () => { throw new Error('SECRET fixture path C:\\private\\note.md'); };
    safeHandle({ handle(_channel, fn) { callback = fn; } }, 'test:failure', asynchronous ? async () => handler() : handler,
      { isTrustedSender: f.isTrustedSender, reportError: (report) => reports.push(report) });
    const result = await callback(f.event, { content: 'PRIVATE NOTE TEXT' });
    assert.deepEqual(result, { ok: false, code: 'ipc_request_failed', message: 'The request could not be completed. Try again or restart Vincarios.' });
    assert.deepEqual(reports, [{ channel: 'test:failure', code: 'ipc_request_failed' }]);
    assert.doesNotMatch(JSON.stringify({ result, reports }), /SECRET|PRIVATE|private/);
  });
}

for (const asynchronous of [false, true]) {
  test('a failing ' + (asynchronous ? 'async' : 'sync') + ' reporter stays within the error boundary', async () => {
    let callback;
    const failure = () => { throw new Error('Synthetic reporter failure'); };
    safeHandle({ handle(_channel, fn) { callback = fn; } }, 'test:failure', () => { throw new Error('Failure'); }, {
      isTrustedSender: () => true, reportError: asynchronous ? async () => failure() : failure
    });
    assert.equal((await callback({})).code, 'ipc_request_failed');
    await new Promise((resolve) => setImmediate(resolve));
  });
}
