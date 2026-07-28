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

  registerVaultIpc(ipcMain, dialog, null, readService, writeService, null, null, null, null, null, null, null, null, createRootCoordinator([readService, writeService]));
  await handlers.get(IPC_CHANNELS.VAULT_SELECT_FOLDER)();

  assert.deepEqual(roots, [['read', 'D:/Vault'], ['write', 'D:/Vault']]);
});

test('vault IPC delegates root activation to the main-owned session coordinator', async () => {
  const handlers = new Map();
  const calls = [];
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = {
    getState() { return {}; },
    listFolder() {},
    readMarkdown() {},
    setRoot() {
      throw new Error('IPC must not activate the read service directly.');
    }
  };
  const sessionCoordinator = {
    activateRoot(root, context) {
      calls.push([root, context]);
      return { ok: true, root, namespaceMigration: { ok: true, mode: 'none' }, warnings: [] };
    }
  };

  registerVaultIpc(
    ipcMain,
    {},
    null,
    readService,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    sessionCoordinator
  );

  const result = await handlers.get(IPC_CHANNELS.VAULT_SET_ROOT)(null, 'D:/Vault');

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [['D:/Vault', { source: 'recent' }]]);
});

test('vault IPC exposes read image assets through a read-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = {
    setRoot() {},
    getState() { return {}; },
    listFolder() {},
    readMarkdown() {},
    readImageAsset(payload) {
      return { ok: true, payload, dataUrl: 'data:image/png;base64,AAAA' };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, null);
  const result = await handlers.get(IPC_CHANNELS.VAULT_READ_IMAGE_ASSET)(null, { targetPath: 'A.png', currentPath: 'Note.md' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { targetPath: 'A.png', currentPath: 'Note.md' });
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

test('vault IPC exposes create folder through a write-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = {
    createFolder(payload) {
      return { ok: true, payload, path: '02_Projects/Alpha' };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, writeService);
  const result = await handlers.get(IPC_CHANNELS.VAULT_CREATE_FOLDER)(null, { targetFolder: '02_Projects/Alpha' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { targetFolder: '02_Projects/Alpha' });
});
test('vault IPC exposes manual rename through a write-specific channel', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = {
    renameFile(payload) {
      return { ok: true, payload, targetPath: '03_Knowledge/New.md' };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, writeService);
  const result = await handlers.get(IPC_CHANNELS.VAULT_RENAME_FILE)(null, { sourcePath: '03_Knowledge/Old.md', newName: 'New' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.payload, { sourcePath: '03_Knowledge/Old.md', newName: 'New' });
});
test('vault IPC also sets embedding root after folder selection and direct root set', async () => {
  const handlers = new Map();
  const roots = [];
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const dialog = {
    async showOpenDialog() {
      return { canceled: false, filePaths: ['D:/Vault'] };
    }
  };
  const readService = { setRoot(root) { roots.push(['read', root]); return { ok: true, root }; }, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const writeService = { setRoot(root) { roots.push(['write', root]); return { ok: true, root }; } };
  const embeddingService = { setRoot(root) { roots.push(['embedding', root]); return { ok: true, root }; } };
  const embeddingIndexStatusService = { setRoot(root) { roots.push(['embedding-health', root]); return { ok: true, root }; } };
  const vaultChangeService = { setRoot(root) { roots.push(['vault-change', root]); return { ok: true, root }; } };
  const vaultSearchService = { setRoot(root) { roots.push(['vault-search', root]); return { ok: true, root }; } };

  registerVaultIpc(ipcMain, dialog, null, readService, writeService, embeddingService, null, embeddingIndexStatusService, vaultChangeService, vaultSearchService, null, null, null, createRootCoordinator([readService, writeService, embeddingService, embeddingIndexStatusService, vaultChangeService, vaultSearchService]));
  await handlers.get(IPC_CHANNELS.VAULT_SELECT_FOLDER)();
  await handlers.get(IPC_CHANNELS.VAULT_SET_ROOT)(null, 'D:/Vault2');

  assert.deepEqual(roots, [
    ['read', 'D:/Vault'],
    ['write', 'D:/Vault'],
    ['embedding', 'D:/Vault'],
    ['embedding-health', 'D:/Vault'],
    ['vault-change', 'D:/Vault'],
    ['vault-search', 'D:/Vault'],
    ['read', 'D:/Vault2'],
    ['write', 'D:/Vault2'],
    ['embedding', 'D:/Vault2'],
    ['embedding-health', 'D:/Vault2'],
    ['vault-change', 'D:/Vault2'],
    ['vault-search', 'D:/Vault2']
  ]);
});

test('vault IPC exposes the portable Vault Profile service', async () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const profileService = {
    getProfile() { return { ok: true, profile: { roles: { inbox: 'Inbox' } } }; },
    setRole(payload) { return { ok: true, profile: { roles: { [payload.role]: payload.folderPath } } }; },
    resetRole(payload) { return { ok: true, profile: { roles: {}, reset: payload.role } }; },
    setAppearance(payload) { return { ok: true, profile: { appearance: payload } }; }
  };

  registerVaultIpc(ipcMain, {}, null, readService, null, null, profileService);

  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_GET_PROFILE)(), { ok: true, profile: { roles: { inbox: 'Inbox' } } });
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_SET_PROFILE_ROLE)(null, { role: 'inbox', folderPath: 'Inbox' }), { ok: true, profile: { roles: { inbox: 'Inbox' } } });
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_RESET_PROFILE_ROLE)(null, { role: 'inbox' }), { ok: true, profile: { roles: {}, reset: 'inbox' } });
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_SET_PROFILE_APPEARANCE)(null, { themeOverride: 'light' }), { ok: true, profile: { appearance: { themeOverride: 'light' } } });
});

test('vault IPC lists local profile SVGs through the main-process service', () => {
  const handlers = new Map();
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = { setRoot() {}, getState() { return {}; }, listFolder() {}, readMarkdown() {} };
  const profileService = {
    listLocalIcons() {
      return { ok: true, icons: [{ kind: 'custom', path: '.vincarios/icons/compass.svg' }] };
    }
  };

  registerVaultIpc(ipcMain, {}, null, readService, null, null, profileService);
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_LIST_PROFILE_ICONS)(), {
    ok: true,
    icons: [{ kind: 'custom', path: '.vincarios/icons/compass.svg' }]
  });
});

test('vault IPC routes vault-local recent files through the dedicated main service', async () => {
  const handlers = new Map();
  const calls = [];
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = {
    setRoot(root) { calls.push(['read-root', root]); return { ok: true, root }; },
    getState() { return {}; },
    listFolder() {},
    readMarkdown() {}
  };
  const recentFilesService = {
    setRoot(root) { calls.push(['recent-root', root]); return { ok: true, root }; },
    list() { return { ok: true, files: [{ path: 'Notes/One.md', openedAt: '2026-07-17T12:00:00.000Z' }] }; },
    record(payload) { return { ok: true, files: [{ path: payload.path, openedAt: '2026-07-17T12:00:00.000Z' }] }; }
  };

  registerVaultIpc(ipcMain, {}, null, readService, null, null, null, null, null, null, recentFilesService, null, null, createRootCoordinator([readService, recentFilesService]));
  await handlers.get(IPC_CHANNELS.VAULT_SET_ROOT)(null, 'D:/Vault');

  assert.deepEqual(calls, [['read-root', 'D:/Vault'], ['recent-root', 'D:/Vault']]);
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_LIST_RECENT_FILES)(), {
    ok: true,
    files: [{ path: 'Notes/One.md', openedAt: '2026-07-17T12:00:00.000Z' }]
  });
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_RECORD_RECENT_FILE)(null, { path: 'Notes/Two.md' }), {
    ok: true,
    files: [{ path: 'Notes/Two.md', openedAt: '2026-07-17T12:00:00.000Z' }]
  });
});
test('vault IPC routes persistent review basket snapshots through the dedicated main service', async () => {
  const handlers = new Map();
  const calls = [];
  const ipcMain = { handle(channel, handler) { handlers.set(channel, handler); } };
  const readService = {
    setRoot(root) { calls.push(['read-root', root]); return { ok: true, root }; },
    getState() { return {}; },
    listFolder() {},
    readMarkdown() {}
  };
  const reviewBasketService = {
    setRoot(root) { calls.push(['review-root', root]); return { ok: true, root }; },
    load() { return { ok: true, snapshot: { items: [] } }; },
    save(payload) { return { ok: true, snapshot: payload }; }
  };

  registerVaultIpc(ipcMain, {}, null, readService, null, null, null, null, null, null, null, null, reviewBasketService, createRootCoordinator([readService, reviewBasketService]));
  await handlers.get(IPC_CHANNELS.VAULT_SET_ROOT)(null, 'D:/Vault');

  assert.deepEqual(calls, [['read-root', 'D:/Vault'], ['review-root', 'D:/Vault']]);
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_LOAD_REVIEW_BASKET)(), { ok: true, snapshot: { items: [] } });
  assert.deepEqual(handlers.get(IPC_CHANNELS.VAULT_SAVE_REVIEW_BASKET)(null, { items: [{ id: 'proposal-1' }] }), {
    ok: true,
    snapshot: { items: [{ id: 'proposal-1' }] }
  });
});
function createRootCoordinator(services) {
  return {
    activateRoot(root) {
      for (const service of services) {
        const result = service.setRoot(root);
        if (result && result.ok === false) return result;
      }
      return {
        ok: true,
        root,
        namespaceMigration: { ok: true, mode: 'none' },
        warnings: []
      };
    }
  };
}
