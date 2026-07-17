'use strict';

const path = require('node:path');
const { createMainWindow } = require('./createMainWindow');
const { registerAppIpc } = require('../ipc/registerAppIpc');
const { registerChatIpc } = require('../ipc/registerChatIpc');
const { registerVaultIpc } = require('../ipc/registerVaultIpc');
const { registerProviderIpc } = require('../ipc/registerProviderIpc');
const { registerSettingsIpc } = require('../ipc/registerSettingsIpc');
const { registerEmbeddingIpc } = require('../ipc/registerEmbeddingIpc');
const { registerVaultIndexIpc } = require('../ipc/registerVaultIndexIpc');
const { registerVaultSearchIpc } = require('../ipc/registerVaultSearchIpc');
const { createProviderChatService } = require('../providers/providerChatService');
const { createProviderStatusService } = require('../providers/providerStatusService');
const { createProviderModelService } = require('../providers/providerModelService');
const { createProviderSettingsState } = require('../providers/providerRegistry');
const { createSettingsStore, toProviderRegistryOptions } = require('../settings/settingsStore');
const { createSettingsService } = require('../settings/settingsService');
const { createVaultReadService } = require('../vault/vaultReadService');
const { createVaultWriteService } = require('../vault/vaultWriteService');
const { createVaultProfileService } = require('../vault/vaultProfileService');
const { createVaultChangeService } = require('../vault/vaultChangeService');
const { createVaultIndexFreshnessService } = require('../vault/vaultIndexFreshnessService');
const { createEmbeddingSimilaritySearch } = require('../embeddings/embeddingSimilaritySearch');
const { createEmbeddingIndexer } = require('../embeddings/embeddingIndexer');
const { createEmbeddingIndexStatusService } = require('../embeddings/embeddingIndexStatusService');
const { createEmbeddingIndexHealthService } = require('../embeddings/embeddingIndexHealthService');
const { createMetadataIndexer } = require('../metadata/metadataIndexer');
const { createMetadataIndexStatusService } = require('../metadata/metadataIndexStatusService');
const { createVaultIndexHealthService } = require('../metadata/vaultIndexHealthService');
const { createFullTextIndexer } = require('../search/fullTextIndexer');
const { createFullTextIndexStatusService } = require('../search/fullTextIndexStatusService');
const { createFullTextIndexHealthService } = require('../search/fullTextIndexHealthService');
const { createVaultSearchService } = require('../search/vaultSearchService');
const { IPC_CHANNELS } = require('../../shared/ipc/channels');
const { getPortableSettingsPath, migrateLegacySettingsToPortable } = require('./portableDataPath');

function bootstrapElectron(electron, options) {
  options = options || {};
  const { app, ipcMain, dialog, BrowserWindow } = electron;
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..', '..', '..');

  const vaultReadService = options.vaultReadService || createVaultReadService();
  const settingsFilePath = options.settingsFilePath || getDefaultSettingsPath(app, projectRoot);
  if (!options.settingsFilePath) {
    migrateLegacySettingsToPortable({ app, projectRoot, portablePath: settingsFilePath });
  }
  const settingsStore = options.settingsStore || createSettingsStore({
    filePath: settingsFilePath,
    initialSettings: options.initialSettings
  });
  const vaultWriteService = options.vaultWriteService || createVaultWriteService({ settingsStore });
  const vaultProfileService = options.vaultProfileService || createVaultProfileService();
  const providerSettingsOptions = Object.assign(
    {},
    options.providerOptions || {},
    toProviderRegistryOptions(settingsStore.getSettings())
  );
  const providerSettingsState = options.providerSettingsState || createProviderSettingsState(providerSettingsOptions);
  const providerOptions = Object.assign({}, options.providerOptions || {}, {
    settingsState: providerSettingsState,
    settingsStore,
    timeoutMs: settingsStore.getSettings().limits.providerTimeoutMs,
    modelListTimeoutMs: settingsStore.getSettings().limits.modelListTimeoutMs
  });
  const settingsService = options.settingsService || createSettingsService({ settingsStore, providerSettingsState });
  const providerStatusService = options.providerStatusService || createProviderStatusService(providerOptions);
  const providerModelService = options.providerModelService || createProviderModelService(Object.assign({}, providerOptions, {
    timeoutMs: providerOptions.modelListTimeoutMs
  }));
  const chatService = options.chatService || createProviderChatService(providerOptions);
  const vaultIndexFreshnessService = options.vaultIndexFreshnessService || createVaultIndexFreshnessService();
  const embeddingIndexer = options.embeddingIndexer || createEmbeddingIndexer({ settingsStore });
  const embeddingSearchService = options.embeddingSearchService || createEmbeddingSimilaritySearch({
    settingsStore,
    indexer: embeddingIndexer,
    getVaultProfile: () => vaultProfileService.getProfile()
  });
  const embeddingIndexStatusService = options.embeddingIndexStatusService || createEmbeddingIndexStatusService({ projectRoot, freshnessService: vaultIndexFreshnessService });
  const embeddingIndexHealthService = options.embeddingIndexHealthService || createEmbeddingIndexHealthService({
    statusService: embeddingIndexStatusService,
    indexer: embeddingIndexer,
    freshnessService: vaultIndexFreshnessService
  });

  registerChatIpc(ipcMain, chatService);
  registerAppIpc(ipcMain, {
    appName: 'vitruvios',
    version: app.getVersion ? app.getVersion() : '0.1.0',
    shell: electron.shell
  });
  const metadataIndexer = options.metadataIndexer || createMetadataIndexer();
  const metadataIndexStatusService = options.metadataIndexStatusService || createMetadataIndexStatusService({ freshnessService: vaultIndexFreshnessService });
  const fullTextIndexer = options.fullTextIndexer || createFullTextIndexer();
  const fullTextIndexStatusService = options.fullTextIndexStatusService || createFullTextIndexStatusService({ freshnessService: vaultIndexFreshnessService });
  const fullTextIndexHealthService = options.fullTextIndexHealthService || createFullTextIndexHealthService({
    indexer: fullTextIndexer,
    statusService: fullTextIndexStatusService,
    freshnessService: vaultIndexFreshnessService
  });
  const vaultIndexHealthService = options.vaultIndexHealthService || createVaultIndexHealthService({
    metadataIndexer,
    metadataStatusService: metadataIndexStatusService,
    embeddingHealthService: embeddingIndexHealthService,
    fullTextHealthService: fullTextIndexHealthService,
    freshnessService: vaultIndexFreshnessService
  });
  const vaultChangeService = options.vaultChangeService || createVaultChangeService();
  const vaultSearchService = options.vaultSearchService || createVaultSearchService();
  registerVaultIpc(ipcMain, dialog, BrowserWindow, vaultReadService, vaultWriteService, embeddingSearchService, vaultProfileService, vaultIndexHealthService, vaultChangeService, vaultSearchService);
  registerProviderIpc(ipcMain, providerStatusService, providerModelService);
  registerSettingsIpc(ipcMain, settingsService);
  registerEmbeddingIpc(ipcMain, embeddingSearchService, embeddingIndexHealthService);
  registerVaultIndexIpc(ipcMain, vaultIndexHealthService);
  registerVaultSearchIpc(ipcMain, vaultSearchService);
  embeddingIndexHealthService.subscribe((health) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window && window.webContents) window.webContents.send(IPC_CHANNELS.EMBEDDINGS_INDEX_HEALTH_CHANGED, health);
    });
  });
  vaultIndexHealthService.subscribe((health) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window && window.webContents) window.webContents.send(IPC_CHANNELS.INDEXES_HEALTH_CHANGED, health);
    });
  });
    vaultChangeService.subscribe((change) => {
    const canApplyIncrementalMetadata = change && change.affectsMarkdownIndex === true
      && change.requiresMetadataRebuild !== true
      && Array.isArray(change.markdownPaths)
      && change.markdownPaths.length > 0
      && typeof vaultIndexHealthService.applyMetadataChanges === 'function';
    const incremental = canApplyIncrementalMetadata
      ? vaultIndexHealthService.applyMetadataChanges(change.markdownPaths)
      : { ok: false, code: 'metadata_incremental_not_applicable' };
    if (!incremental.ok && change && change.affectsMarkdownIndex && typeof vaultIndexHealthService.markStale === 'function') {
      vaultIndexHealthService.markStale();
    }
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window && window.webContents) window.webContents.send(IPC_CHANNELS.VAULT_CONTENT_CHANGED, change);
    });
  });

  app.whenReady().then(() => {
    createMainWindow(electron, { projectRoot });

    app.on('activate', () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow(electron, { projectRoot });
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

function getDefaultSettingsPath(app, projectRoot) {
  return getPortableSettingsPath(projectRoot);
}

module.exports = {
  bootstrapElectron,
  getDefaultSettingsPath
};
