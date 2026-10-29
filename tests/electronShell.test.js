'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createWindowOptions, createMainWindow } = require('../src/main/app/createMainWindow');
const { IPC_CHANNELS } = require('../src/shared/ipc/channels');
const { DEFAULT_THEME_COLORS } = require('../src/shared/ui/themeDefaults');
const { bootstrapElectron } = require('../src/main/app/bootstrapElectron');

test('main window options keep the renderer sandboxed', () => {
  const options = createWindowOptions(path.join('D:', 'Vincarios_AGENT'));

  assert.equal(options.show, true);
  assert.equal(options.backgroundColor, DEFAULT_THEME_COLORS.backgroundPrimary);
  assert.equal(options.webPreferences.contextIsolation, true);
  assert.equal(options.webPreferences.nodeIntegration, false);
  assert.equal(options.webPreferences.sandbox, true);
  assert.equal(options.webPreferences.webSecurity, true);
  assert.equal(options.webPreferences.allowRunningInsecureContent, false);
  assert.match(options.webPreferences.preload, /src[\\/]preload[\\/]index\.js$/);
});

test('main window uses the packaged Vincarios Windows icon', () => {
  const root = path.resolve(__dirname, '..');
  const options = createWindowOptions(root);
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  assert.equal(options.icon, path.join(root, 'src', 'renderer', 'assets', 'brand', 'vincarios-icon.ico'));
  assert.equal(options.icon, path.resolve(root, packageJson.build.icon));
  assert.equal(fs.existsSync(options.icon), true);
});

test('IPC channels expose app info, provider, chat, and reviewed vault actions', () => {
  assert.deepEqual(Object.keys(IPC_CHANNELS).sort(), [
    'APP_INFO',
    'APP_MENU_NAVIGATE',
    'APP_OPEN_EXTERNAL',
    'CHAT_CANCEL',
    'CHAT_CHECK_UPDATE_BUDGET',
    'CHAT_SEND',
    'EMBEDDINGS_FIND_SIMILAR_NOTES',
    'EMBEDDINGS_GET_INDEX_STATUS',
    'EMBEDDINGS_INDEX_HEALTH_CHANGED',
    'EMBEDDINGS_REFRESH_INDEX',
    'INDEXES_DELETE_FULL_TEXT',
    'INDEXES_DISABLE_FULL_TEXT',
    'INDEXES_ENABLE_FULL_TEXT',
    'INDEXES_GET_HEALTH',
    'INDEXES_HEALTH_CHANGED',
    'INDEXES_REFRESH',
    'INDEXES_REFRESH_FULL_TEXT',
    'PROVIDER_MODELS',
    'PROVIDER_SET_ACTIVE',
    'PROVIDER_SET_MODEL',
    'PROVIDER_STATUS',
    'SEARCH_QUERY',
    'SETTINGS_GET',
    'SETTINGS_RESET_PROVIDER_URL',
    'SETTINGS_SET_ACTION_DEFAULTS',
    'SETTINGS_SET_EMBEDDINGS',
    'SETTINGS_SET_LAYOUT',
    'SETTINGS_SET_LIMITS',
    'SETTINGS_SET_PROVIDER_URL',
    'SETTINGS_SET_RECENT_VAULTS',
    'SETTINGS_SET_THEME',
    'TEMPLATE_CREATE_FROM_REVIEW',
    'VAULT_CONTENT_CHANGED',
    'VAULT_CREATE_FOLDER',
    'VAULT_CREATE_NOTE',
    'VAULT_GET_INVENTORY',
    'VAULT_GET_PROFILE',
    'VAULT_LIST_FOLDER',
    'VAULT_LIST_PROFILE_ICONS',
    'VAULT_LIST_RECENT_FILES',
    'VAULT_LOAD_REVIEW_BASKET',
    'VAULT_READ_IMAGE_ASSET',
    'VAULT_READ_MARKDOWN',
    'VAULT_RECORD_RECENT_FILE',
    'VAULT_RENAME_FILE',
    'VAULT_RESET_PROFILE_ROLE',
    'VAULT_SAVE_REVIEW_BASKET',
    'VAULT_SELECT_FOLDER',
    'VAULT_SET_PROFILE_APPEARANCE',
    'VAULT_SET_PROFILE_ROLE',
    'VAULT_SET_ROOT',
    'VAULT_STATE',
    'VAULT_UPDATE_NOTE'
  ]);
  assert.equal(IPC_CHANNELS.APP_INFO, 'app:info');
  assert.equal(IPC_CHANNELS.APP_MENU_NAVIGATE, 'app:menu-navigate');
  assert.equal(IPC_CHANNELS.APP_OPEN_EXTERNAL, 'app:open-external');
  assert.equal(IPC_CHANNELS.CHAT_SEND, 'chat:send');
  assert.equal(IPC_CHANNELS.CHAT_CANCEL, 'chat:cancel');
  assert.equal(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES, 'embeddings:find-similar-notes');
  assert.equal(IPC_CHANNELS.EMBEDDINGS_GET_INDEX_STATUS, 'embeddings:get-index-status');
  assert.equal(IPC_CHANNELS.EMBEDDINGS_REFRESH_INDEX, 'embeddings:refresh-index');
  assert.equal(IPC_CHANNELS.EMBEDDINGS_INDEX_HEALTH_CHANGED, 'embeddings:index-health-changed');
  assert.equal(IPC_CHANNELS.INDEXES_GET_HEALTH, 'indexes:get-health');
  assert.equal(IPC_CHANNELS.INDEXES_REFRESH, 'indexes:refresh');
  assert.equal(IPC_CHANNELS.INDEXES_HEALTH_CHANGED, 'indexes:health-changed');
  assert.equal(IPC_CHANNELS.PROVIDER_STATUS, 'provider:status');
  assert.equal(IPC_CHANNELS.VAULT_GET_INVENTORY, 'vault:get-inventory');
  assert.equal(IPC_CHANNELS.SEARCH_QUERY, 'search:query');
  assert.equal(IPC_CHANNELS.PROVIDER_MODELS, 'provider:models');
  assert.equal(IPC_CHANNELS.PROVIDER_SET_ACTIVE, 'provider:set-active');
  assert.equal(IPC_CHANNELS.PROVIDER_SET_MODEL, 'provider:set-model');
  assert.equal(IPC_CHANNELS.SETTINGS_GET, 'settings:get');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_PROVIDER_URL, 'settings:set-provider-url');
  assert.equal(IPC_CHANNELS.SETTINGS_RESET_PROVIDER_URL, 'settings:reset-provider-url');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_LAYOUT, 'settings:set-layout');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_LIMITS, 'settings:set-limits');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_EMBEDDINGS, 'settings:set-embeddings');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_ACTION_DEFAULTS, 'settings:set-action-defaults');
  assert.equal(IPC_CHANNELS.SETTINGS_SET_THEME, 'settings:set-theme');
  assert.equal(IPC_CHANNELS.VAULT_CONTENT_CHANGED, 'vault:content-changed');
  assert.equal(IPC_CHANNELS.VAULT_READ_MARKDOWN, 'vault:read-markdown');
  assert.equal(IPC_CHANNELS.VAULT_READ_IMAGE_ASSET, 'vault:read-image-asset');
  assert.equal(IPC_CHANNELS.VAULT_CREATE_NOTE, 'vault:create-note');
  assert.equal(IPC_CHANNELS.VAULT_CREATE_FOLDER, 'vault:create-folder');
  assert.equal(IPC_CHANNELS.VAULT_UPDATE_NOTE, 'vault:update-note');
  assert.equal(IPC_CHANNELS.VAULT_RENAME_FILE, 'vault:rename-file');
  assert.equal(IPC_CHANNELS.VAULT_GET_PROFILE, 'vault:get-profile');
  assert.equal(IPC_CHANNELS.VAULT_LIST_PROFILE_ICONS, 'vault:list-profile-icons');
  assert.equal(IPC_CHANNELS.VAULT_LIST_RECENT_FILES, 'vault:list-recent-files');
  assert.equal(IPC_CHANNELS.VAULT_RECORD_RECENT_FILE, 'vault:record-recent-file');
  assert.equal(IPC_CHANNELS.VAULT_LOAD_REVIEW_BASKET, 'vault:load-review-basket');
  assert.equal(IPC_CHANNELS.VAULT_SAVE_REVIEW_BASKET, 'vault:save-review-basket');
  assert.equal(IPC_CHANNELS.VAULT_SET_PROFILE_ROLE, 'vault:set-profile-role');
  assert.equal(IPC_CHANNELS.VAULT_RESET_PROFILE_ROLE, 'vault:reset-profile-role');
  assert.equal(IPC_CHANNELS.VAULT_SET_PROFILE_APPEARANCE, 'vault:set-profile-appearance');
});

test('preload exposes image asset reads without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /readImageAsset\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_READ_IMAGE_ASSET, payload\)/);
});
test('preload exposes reviewed create note writes through the vault API', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /createNote\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_CREATE_NOTE, payload\)/);
});
test('preload exposes reviewed update note writes through the vault API', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /updateNote\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_UPDATE_NOTE, payload\)/);
});

test('preload exposes provider model controls without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /models\(payload\)/);
  assert.match(preloadSource, /setActive\(payload\)/);
  assert.match(preloadSource, /setModel\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_MODELS, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_SET_ACTIVE, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.PROVIDER_SET_MODEL, payload\)/);
});

test('preload exposes chat cancel and settings without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /cancel\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.CHAT_CANCEL, payload\)/);
  assert.match(preloadSource, /settings: Object\.freeze/);
  assert.match(preloadSource, /setProviderUrl\(payload\)/);
  assert.match(preloadSource, /resetProviderUrl\(payload\)/);
  assert.match(preloadSource, /setLayout\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_GET\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_SET_PROVIDER_URL, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_RESET_PROVIDER_URL, payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SETTINGS_SET_LAYOUT, payload\)/);
});

test('preload exposes manual rename without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /renameFile\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_RENAME_FILE, payload\)/);
});
test('preload exposes embedding search without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /embeddings: Object\.freeze/);
  assert.match(preloadSource, /findSimilarNotes\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.EMBEDDINGS_FIND_SIMILAR_NOTES, payload\)/);
  assert.match(preloadSource, /getIndexStatus\(\)/);
  assert.match(preloadSource, /refreshIndex\(\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.EMBEDDINGS_GET_INDEX_STATUS/);
  assert.match(preloadSource, /IPC_CHANNELS\.EMBEDDINGS_REFRESH_INDEX/);
  assert.match(preloadSource, /onIndexHealthChanged\(listener\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.EMBEDDINGS_INDEX_HEALTH_CHANGED/);
  assert.match(preloadSource, /indexes: Object\.freeze/);
  assert.match(preloadSource, /getHealth\(\)/);
  assert.match(preloadSource, /refresh\(\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.INDEXES_GET_HEALTH/);
  assert.match(preloadSource, /IPC_CHANNELS\.INDEXES_REFRESH/);
  assert.match(preloadSource, /IPC_CHANNELS\.INDEXES_HEALTH_CHANGED/);
});


test('preload exposes local vault search without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /search: Object\.freeze/);
  assert.match(preloadSource, /query\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.SEARCH_QUERY, payload\)/);
});

test('preload exposes embedding settings without filesystem access', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(source, /setEmbeddings\(payload\)/);
  assert.match(source, /SETTINGS_SET_EMBEDDINGS/);
  assert.doesNotMatch(source, /require('node:fs')/);
});

test('preload exposes native menu navigation without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');
  assert.match(preloadSource, /appMenu: Object\.freeze/);
  assert.match(preloadSource, /onNavigate\(listener\)/);
  assert.match(preloadSource, /ipcRenderer\.on\(IPC_CHANNELS\.APP_MENU_NAVIGATE, handler\)/);
  assert.match(preloadSource, /ipcRenderer\.removeListener\(IPC_CHANNELS\.APP_MENU_NAVIGATE, handler\)/);
});
test('preload exposes external link opening without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /openExternal\(url\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.APP_OPEN_EXTERNAL, url\)/);
});
test('preload exposes portable Vault Profile configuration without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /getProfile\(\)/);
  assert.match(preloadSource, /setProfileRole\(payload\)/);
  assert.match(preloadSource, /resetProfileRole\(payload\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_GET_PROFILE/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_SET_PROFILE_ROLE/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_RESET_PROFILE_ROLE/);
  assert.match(preloadSource, /listProfileIcons\(\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_LIST_PROFILE_ICONS/);
});

test('preload exposes recent-files metadata without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /listRecentFiles\(\)/);
  assert.match(preloadSource, /recordRecentFile\(payload\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_LIST_RECENT_FILES/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_RECORD_RECENT_FILE/);
  assert.doesNotMatch(preloadSource, /require\('node:fs'\)/);
});
test('preload exposes vault appearance updates without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /setProfileAppearance\(payload\)/);
  assert.match(preloadSource, /ipcRenderer\.invoke\(IPC_CHANNELS\.VAULT_SET_PROFILE_APPEARANCE, payload\)/);
});

test('Electron bootstrap creates and wires the read-only embedding index status service', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'app', 'bootstrapElectron.js'), 'utf8');

  assert.match(source, /createEmbeddingIndexStatusService/);
  assert.match(source, /const embeddingIndexStatusService = options\.embeddingIndexStatusService/);
  assert.match(source, /createEmbeddingIndexHealthService/);
  assert.match(source, /const embeddingIndexHealthService = options\.embeddingIndexHealthService/);
  assert.match(source, /registerVaultIpc\([\s\S]*embeddingIndexHealthService\)/);
  assert.match(source, /registerEmbeddingIpc\([\s\S]*embeddingIndexHealthService\)/);
  assert.match(source, /EMBEDDINGS_INDEX_HEALTH_CHANGED/);
});
test('Electron bootstrap wires one vault index health boundary for metadata and embeddings', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'app', 'bootstrapElectron.js'), 'utf8');
  const vaultIpcSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'ipc', 'registerVaultIpc.js'), 'utf8');

  assert.match(source, /createVaultIndexHealthService/);
  assert.match(source, /const vaultIndexHealthService = options\.vaultIndexHealthService/);
  assert.match(source, /registerVaultIpc\([\s\S]*vaultIndexHealthService\)/);
  assert.match(source, /name: 'index-health', service: vaultIndexHealthService/);
  assert.doesNotMatch(vaultIpcSource, /\.setRoot\(vaultRoot\)/);
  assert.doesNotMatch(vaultIpcSource, /metadataIndexer\.setRoot\(vaultRoot\)/);
});
test('Electron bootstrap authorizes renderer root activation from persisted recent vaults', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'app', 'bootstrapElectron.js'), 'utf8');

  assert.match(source, /createRecentVaultAuthorizer/);
  assert.match(source, /authorizeRoot: createRecentVaultAuthorizer\(settingsService\)/);
  assert.match(source, /name: 'read', service: vaultReadService/);
});
test('Electron bootstrap owns one vault change service for tree updates and index staleness', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'app', 'bootstrapElectron.js'), 'utf8');

  assert.match(source, /createVaultChangeService/);
  assert.match(source, /const vaultChangeService = options\.vaultChangeService/);
  assert.match(source, /vaultChangeService\.subscribe/);
  assert.match(source, /vaultIndexHealthService\.markStale/);
  assert.match(source, /VAULT_CONTENT_CHANGED/);
});
test('preload exposes vault change notifications without filesystem access', () => {
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload', 'index.js'), 'utf8');

  assert.match(preloadSource, /onChanged\(listener\)/);
  assert.match(preloadSource, /IPC_CHANNELS\.VAULT_CONTENT_CHANGED/);
});

test('preload resolves every full-text index method to a concrete IPC channel', async () => {
  const Module = require('node:module');
  const preloadPath = path.join(__dirname, '..', 'src', 'preload', 'index.js');
  const originalLoad = Module._load;
  const calls = [];
  let exposedApi = null;

  Module._load = function load(request, parent, isMain) {
    if (request === 'electron') {
      return {
        contextBridge: { exposeInMainWorld(_name, api) { exposedApi = api; } },
        ipcRenderer: {
          invoke(channel) { calls.push(channel); return Promise.resolve({ ok: true }); },
          on() {},
          removeListener() {}
        }
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve(preloadPath)];
    require(preloadPath);
    await exposedApi.indexes.setFullTextEnabled(true);
    await exposedApi.indexes.setFullTextEnabled(false);
    await exposedApi.indexes.refreshFullText();
    await exposedApi.indexes.deleteFullText();
  } finally {
    delete require.cache[require.resolve(preloadPath)];
    Module._load = originalLoad;
  }

  assert.deepEqual(calls, [
    'indexes:enable-full-text',
    'indexes:disable-full-text',
    'indexes:refresh-full-text',
    'indexes:delete-full-text'
  ]);
});

test('Electron bootstrap wires optional full-text search into the shared index boundary', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'app', 'bootstrapElectron.js'), 'utf8');

  assert.match(source, /createFullTextIndexer/);
  assert.match(source, /createFullTextIndexStatusService/);
  assert.match(source, /createFullTextIndexHealthService/);
  assert.match(source, /fullTextHealthService: fullTextIndexHealthService/);
  assert.match(source, /freshnessService: vaultIndexFreshnessService/);
});

test('main window blocks direct navigation and popup creation', async () => {
  const listeners = new Map();
  let windowOpenHandler = null;
  const fakeWindow = {
    webContents: {
      on(event, handler) {
        listeners.set(event, handler);
      },
      setWindowOpenHandler(handler) {
        windowOpenHandler = handler;
      }
    },
    loadFile() {
      return Promise.resolve();
    }
  };

  createMainWindow({ BrowserWindow: function BrowserWindow() { return fakeWindow; } }, {
    projectRoot: path.join('D:', 'Vincarios_AGENT')
  });

  let prevented = false;
  listeners.get('will-navigate')({ preventDefault() { prevented = true; } }, 'https://example.com');

  assert.equal(prevented, true);
  assert.deepEqual(windowOpenHandler({ url: 'https://example.com' }), { action: 'deny' });
});

test('second instance quits before migration, settings, services or IPC initialization', () => {
  const calls = [];
  const app = {
    requestSingleInstanceLock() { calls.push('lock'); return false; },
    quit() { calls.push('quit'); }
  };
  const options = new Proxy({}, {
    get() { throw new Error('Startup work ran before acquiring the lock'); }
  });

  assert.doesNotThrow(() => bootstrapElectron({ app }, options));
  assert.deepEqual(calls, ['lock', 'quit']);
});

test('native unload confirmation defaults to Stay and only explicit discard allows unloading', () => {
  const listeners = new Map();
  let choice = 0;
  const prompts = [];
  const fakeWindow = {
    webContents: { on: (type, callback) => listeners.set(type, callback), setWindowOpenHandler() {} },
    loadFile: () => Promise.resolve()
  };
  createMainWindow({
    BrowserWindow: function BrowserWindow() { return fakeWindow; },
    dialog: { showMessageBoxSync(parent, options) { prompts.push({ parent, options }); return choice; } }
  }, { projectRoot: path.resolve(__dirname, '..') });
  const handler = listeners.get('will-prevent-unload');
  assert.equal(typeof handler, 'function');
  for (choice of [0, -1, undefined, 1]) {
    let allowed = false;
    handler({ preventDefault() { allowed = true; } });
    assert.equal(allowed, choice === 1);
  }
  assert.equal(prompts[0].parent, fakeWindow);
  assert.deepEqual(prompts[0].options.buttons, ['Stay', 'Discard changes']);
  assert.equal(prompts[0].options.defaultId, 0);
  assert.equal(prompts[0].options.cancelId, 0);
});

test('second-instance event restores and focuses the live primary window', () => {
  const os = require('node:os');
  const { createSettingsStore } = require('../src/main/settings/settingsStore');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-bootstrap-'));
  const listeners = new Map();
  const calls = [];
  const windows = [{
    isDestroyed: () => false,
    isMinimized: () => true,
    restore: () => calls.push('restore'),
    show: () => calls.push('show'),
    focus: () => calls.push('focus')
  }];
  const electron = {
    app: {
      requestSingleInstanceLock() { calls.push('lock'); return true; },
      on(event, handler) { listeners.set(event, handler); },
      whenReady: () => ({ then() {} }),
      getVersion: () => 'test'
    },
    ipcMain: { handle() { calls.push('ipc'); } },
    BrowserWindow: { getAllWindows: () => windows }
  };
  const options = { projectRoot: root, settingsFilePath: path.join(root, 'settings.json'), settingsStore: createSettingsStore() };
  const service = {
    subscribe: () => () => {},
    sendChat() {},
    getStatus() {},
    getSettings: () => options.settingsStore.getSettings()
  };
  ['vaultReadService', 'vaultWriteService', 'reviewedTemplateService', 'vaultProfileService',
    'vaultRecentFilesService', 'vaultInventoryService', 'vaultReviewBasketService', 'settingsService',
    'providerStatusService', 'providerModelService', 'chatService', 'vaultIndexFreshnessService',
    'embeddingIndexer', 'embeddingSearchService', 'embeddingIndexStatusService', 'embeddingIndexHealthService',
    'metadataIndexer', 'metadataIndexStatusService', 'fullTextIndexer', 'fullTextIndexStatusService',
    'fullTextIndexHealthService', 'vaultIndexHealthService', 'vaultChangeService', 'vaultSearchService',
    'vaultSessionCoordinator'].forEach((name) => { options[name] = service; });

  bootstrapElectron(electron, options);
  assert.equal(calls[0], 'lock');
  assert.equal(typeof listeners.get('second-instance'), 'function');
  calls.length = 0;
  listeners.get('second-instance')();
  assert.deepEqual(calls, ['restore', 'show', 'focus']);
  windows.length = 0;
  assert.doesNotThrow(() => listeners.get('second-instance')());
});

test('bootstrap displays a settings recovery warning once after the window is created', (t) => {
  const os = require('node:os');
  const { createSettingsStore } = require('../src/main/settings/settingsStore');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-settings-start-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const filePath = path.join(root, 'settings.json');
  fs.writeFileSync(filePath, '{broken');
  const settingsStore = createSettingsStore({ filePath });
  const messages = [];
  const windows = [];
  let ready;
  function BrowserWindow() {
    this.webContents = { on() {}, setWindowOpenHandler() {}, send() {} };
    this.loadFile = () => Promise.resolve();
    windows.push(this);
  }
  BrowserWindow.getAllWindows = () => windows;
  const electron = {
    app: { requestSingleInstanceLock: () => true, on() {}, getVersion: () => 'test', whenReady: () => ({ then(callback) { ready = callback; } }) },
    ipcMain: { handle() {} },
    BrowserWindow,
    dialog: { showMessageBoxSync(parent, options) { messages.push({ parent, options }); return 0; } }
  };
  const options = { projectRoot: root, settingsFilePath: filePath, settingsStore };
  const service = { subscribe: () => () => {}, sendChat() {}, getStatus() {}, getSettings: () => settingsStore.getSettings() };
  ['vaultReadService', 'vaultWriteService', 'reviewedTemplateService', 'vaultProfileService',
    'vaultRecentFilesService', 'vaultInventoryService', 'vaultReviewBasketService', 'settingsService',
    'providerStatusService', 'providerModelService', 'chatService', 'vaultIndexFreshnessService',
    'embeddingIndexer', 'embeddingSearchService', 'embeddingIndexStatusService', 'embeddingIndexHealthService',
    'metadataIndexer', 'metadataIndexStatusService', 'fullTextIndexer', 'fullTextIndexStatusService',
    'fullTextIndexHealthService', 'vaultIndexHealthService', 'vaultChangeService', 'vaultSearchService',
    'vaultSessionCoordinator'].forEach((name) => { options[name] = service; });
  bootstrapElectron(electron, options);
  assert.equal(messages.length, 0);
  ready();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].parent, windows[0]);
  assert.equal(messages[0].options.type, 'warning');
  assert.match(messages[0].options.message, /settings\.json\.corrupt-/);
  ready();
  assert.equal(messages.length, 1);
});
