'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('sandboxed preload channel table stays identical to the shared IPC contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');
  const block = source.match(/const IPC_CHANNELS = Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(block, 'Preload IPC channel table is missing.');

  const preloadChannels = {};
  const linePattern = /^\s*([A-Z0-9_]+):\s*'([^']+)',?\s*$/gm;
  let match;
  while ((match = linePattern.exec(block[1])) !== null) {
    preloadChannels[match[1]] = match[2];
  }

  assert.deepEqual(preloadChannels, IPC_CHANNELS);
});

test('every preload IPC reference resolves to a declared channel', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');
  const references = Array.from(source.matchAll(/IPC_CHANNELS\.([A-Z0-9_]+)/g), (match) => match[1]);
  const unknown = Array.from(new Set(references)).filter((name) => !IPC_CHANNELS[name]);

  assert.deepEqual(unknown, []);
});

test('bootstrap routes every preload invoke through the active-window sender boundary', async (t) => {
  const os = require('node:os');
  const { pathToFileURL } = require('node:url');
  const { bootstrapElectron } = require('../src/main/app/bootstrapElectron');
  const { createSettingsStore } = require('../src/main/settings/settingsStore');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-ipc-bootstrap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const handlers = new Map();
  const windows = [];
  const listeners = new Map();
  let ready;
  let serviceCalls = 0;
  function BrowserWindow() {
    this.isDestroyed = () => false;
    this.webContents = { isDestroyed: () => false, mainFrame: { url: pathToFileURL(path.join(root, 'index.html')).href }, on() {}, setWindowOpenHandler() {}, send() {} };
    this.loadFile = () => Promise.resolve();
    windows.push(this);
  }
  BrowserWindow.getAllWindows = () => windows;
  const electron = {
    app: { requestSingleInstanceLock: () => true, getVersion: () => 'test', on: (name, fn) => listeners.set(name, fn), whenReady: () => ({ then(fn) { ready = fn; } }) },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn) }, BrowserWindow,
    dialog: { showOpenDialog: async () => ({ canceled: true }) }
  };
  const settingsStore = createSettingsStore();
  const options = { projectRoot: root, settingsFilePath: path.join(root, 'settings.json'), settingsStore };
  const service = new Proxy({}, { get(_object, key) {
    if (key === 'subscribe') return () => () => {};
    if (key === 'getSettings') return () => settingsStore.getSettings();
    return () => { serviceCalls += 1; return { ok: true }; };
  } });
  ['vaultReadService', 'vaultWriteService', 'reviewedTemplateService', 'vaultProfileService',
    'vaultRecentFilesService', 'vaultInventoryService', 'vaultReviewBasketService', 'settingsService',
    'providerStatusService', 'providerModelService', 'chatService', 'vaultIndexFreshnessService',
    'embeddingIndexer', 'embeddingSearchService', 'embeddingIndexStatusService', 'embeddingIndexHealthService',
    'metadataIndexer', 'metadataIndexStatusService', 'fullTextIndexer', 'fullTextIndexStatusService',
    'fullTextIndexHealthService', 'vaultIndexHealthService', 'vaultChangeService', 'vaultSearchService',
    'vaultSessionCoordinator'].forEach((name) => { options[name] = service; });
  bootstrapElectron(electron, options);
  const preload = fs.readFileSync(path.join(__dirname, '..', 'src/preload/index.js'), 'utf8');
  const invokes = new Set();
  let bridge;
  require('node:vm').runInNewContext(preload, { require(name) {
    assert.equal(name, 'electron');
    return { contextBridge: { exposeInMainWorld(_name, api) { bridge = api; } },
      ipcRenderer: { invoke(channel) { invokes.add(channel); return Promise.resolve(); }, on() {}, removeListener() {} } };
  } });
  async function visit(api) {
    for (const value of Object.values(api)) {
      if (typeof value === 'function') { await value(true); await value(false); }
      else if (value && typeof value === 'object') await visit(value);
    }
  }
  await visit(bridge);
  assert.deepEqual(Array.from(handlers.keys()).sort(), Array.from(invokes).sort());
  for (const [channel, handler] of handlers) {
    assert.equal((await handler(null, {})).code, 'ipc_sender_not_allowed', channel);
  }
  assert.equal(serviceCalls, 0);
  ready();
  const contents = windows[0].webContents;
  const event = { sender: contents, senderFrame: contents.mainFrame };
  assert.deepEqual(await handlers.get(IPC_CHANNELS.APP_INFO)(event), { name: 'vincarios', version: 'test', localFirst: true, markdownFirst: true });
  assert.equal(await handlers.get(IPC_CHANNELS.SETTINGS_GET)(event), settingsStore.getSettings());
  assert.equal((await handlers.get(IPC_CHANNELS.VAULT_SELECT_FOLDER)(event)).code, 'cancelled');
  for (const [channel, handler] of handlers) {
    const childEvent = { sender: contents, senderFrame: { url: contents.mainFrame.url } };
    assert.equal((await handler(childEvent, {})).code, 'ipc_sender_not_allowed', channel);
  }
  assert.equal(serviceCalls, 0);
  windows.length = 0;
  listeners.get('activate')();
  assert.equal((await handlers.get(IPC_CHANNELS.APP_INFO)(event)).code, 'ipc_sender_not_allowed');
  const next = windows[0].webContents;
  assert.equal((await handlers.get(IPC_CHANNELS.APP_INFO)({ sender: next, senderFrame: next.mainFrame })).name, 'vincarios');
});
