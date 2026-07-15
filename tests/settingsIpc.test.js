'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerSettingsIpc } = require('../src/main/ipc/registerSettingsIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('settings IPC exposes get and provider URL override actions', async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    }
  };
  const service = {
    getSettings() { return { version: 1 }; },
    setProviderUrlOverride(providerId, baseUrl) { return { ok: true, providerId, baseUrl }; },
    resetProviderUrlOverride(providerId) { return { ok: true, providerId }; },
    setLimits(payload) { return { ok: true, limits: payload }; },
    setEmbeddingSettings(payload) { return { ok: true, embeddings: payload }; },
    setActionDefaults(payload) { return { ok: true, actionDefaults: payload }; },
    setLayoutPreferences(payload) { return { ok: true, layout: payload }; },
    setTheme(payload) { return { ok: true, theme: payload }; }
  };

  registerSettingsIpc(ipcMain, service);

  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_GET), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_LIMITS), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_ACTION_DEFAULTS), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_LAYOUT), true);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_THEME), true);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_GET)(), { version: 1 });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL)(null, { providerId: 'ollama', baseUrl: 'http://localhost:11435' }), {
    ok: true,
    providerId: 'ollama',
    baseUrl: 'http://localhost:11435'
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL)(null, { providerId: 'ollama' }), {
    ok: true,
    providerId: 'ollama'
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_LIMITS)(null, { maxListedFiles: 300 }), {
    ok: true,
    limits: { maxListedFiles: 300 }
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS)(null, { similarNotes: { maxResults: 5 } }), {
    ok: true,
    embeddings: { similarNotes: { maxResults: 5 } }
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_ACTION_DEFAULTS)(null, { folderSummary: { maxFiles: 12 } }), {
    ok: true,
    actionDefaults: { folderSummary: { maxFiles: 12 } }
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_LAYOUT)(null, { panels: { selectionActionsCollapsed: true } }), {
    ok: true,
    layout: { panels: { selectionActionsCollapsed: true } }
  });
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_THEME)(null, { mode: 'light' }), {
    ok: true,
    theme: { mode: 'light' }
  });
});

test('settings IPC persists recent vault history through the settings service', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const service = {
    getSettings() { return { version: 1 }; },
    setRecentVaults(payload) { return { ok: true, startup: payload }; }
  };

  registerSettingsIpc(ipcMain, service);
  assert.equal(handlers.has(IPC_CHANNELS.SETTINGS_SET_RECENT_VAULTS), true);
  assert.deepEqual(await handlers.get(IPC_CHANNELS.SETTINGS_SET_RECENT_VAULTS)(null, { recentVaults: [] }), {
    ok: true,
    startup: { recentVaults: [] }
  });
});
