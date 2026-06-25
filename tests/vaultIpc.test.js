'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { registerVaultIpc } = require('../src/main/ipc/registerVaultIpc');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');

test('vault IPC sets read and write roots after folder selection', async () => {
  const handlers = new Map();
  const roots = [];
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const dialog = {
    async showOpenDialog() {
      return { canceled: false, filePaths: ['D:/Vault'] };
    }
  };
  const readService = { setRoot(root) { roots.push(['read', root]); return { ok: true, root }; }, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = { setRoot(root) { roots.push(['write', root]); return { ok: true, root }; }, createNote() {} };

  registerVaultIpc(ipcMain, dialog, null, readService, writeService);
  await handlers.get(IPC_CHANNELS.VAULT_SELECT_FOLDER)();

  assert.deepEqual(roots, [['read', 'D:/Vault'], ['write', 'D:/Vault']]);
});

test('vault IPC exposes create note through a write-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = {
    createNote(payload) {
      return { ok: true, payload, path: '00_Inbox/A.md' };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, writeService);
  const result = await handlers.get(IPC_CHANNELS.VAULT_CREATE_NOTE)(null, { title: 'A' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { title: 'A' });
});
test('vault IPC exposes update note through a write-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = {
    updateNote(payload) {
      return { ok: true, payload, path: '03_Wissen/Topic.md' };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, writeService);
  const result = await handlers.get(IPC_CHANNELS.VAULT_UPDATE_NOTE)(null, { targetPath: '03_Wissen/Topic.md' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { targetPath: '03_Wissen/Topic.md' });
});
