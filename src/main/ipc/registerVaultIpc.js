'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerVaultIpc(ipcMain, dialog, browserWindow, vaultReadService, vaultWriteService, embeddingService, vaultProfileService, vaultIndexHealthService, vaultChangeService, vaultSearchService, vaultRecentFilesService, vaultInventoryService, vaultReviewBasketService, vaultSessionCoordinator) {
  ipcMain.handle(IPC_CHANNELS.VAULT_STATE, () => vaultReadService.getState());

  ipcMain.handle(IPC_CHANNELS.VAULT_SELECT_FOLDER, async () => {
    const parent = browserWindow && browserWindow.getFocusedWindow
      ? browserWindow.getFocusedWindow()
      : undefined;
    const result = await dialog.showOpenDialog(parent, {
      title: 'Open Obsidian-style Markdown vault',
      properties: ['openDirectory']
    });

    if (result.canceled || !result.filePaths || !result.filePaths[0]) {
      return { ok: false, code: 'cancelled', message: 'Vault selection cancelled.' };
    }

    return activateVaultRoot(vaultSessionCoordinator, result.filePaths[0], 'picker');
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_SET_ROOT, (_event, vaultRoot) => {
    return activateVaultRoot(vaultSessionCoordinator, vaultRoot, 'recent');
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST_FOLDER, (_event, relativePath) => vaultReadService.listFolder(relativePath));
  ipcMain.handle(IPC_CHANNELS.VAULT_READ_MARKDOWN, (_event, relativePath) => vaultReadService.readMarkdown(relativePath));
  ipcMain.handle(IPC_CHANNELS.VAULT_READ_IMAGE_ASSET, (_event, payload) => vaultReadService.readImageAsset(payload));
  ipcMain.handle(IPC_CHANNELS.VAULT_CREATE_NOTE, (_event, payload) => {
    if (!vaultWriteService || typeof vaultWriteService.createNote !== 'function') {
      return { ok: false, code: 'write_unavailable', message: 'Vault write service unavailable.' };
    }
    return vaultWriteService.createNote(payload);
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_CREATE_FOLDER, (_event, payload) => {
    if (!vaultWriteService || typeof vaultWriteService.createFolder !== 'function') {
      return { ok: false, code: 'write_unavailable', message: 'Vault folder create service unavailable.' };
    }
    return vaultWriteService.createFolder(payload);
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_UPDATE_NOTE, (_event, payload) => {
    if (!vaultWriteService || typeof vaultWriteService.updateNote !== 'function') {
      return { ok: false, code: 'write_unavailable', message: 'Vault update service unavailable.' };
    }
    return vaultWriteService.updateNote(payload);
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_RENAME_FILE, (_event, payload) => {
    if (!vaultWriteService || typeof vaultWriteService.renameFile !== 'function') {
      return { ok: false, code: 'write_unavailable', message: 'Vault rename service unavailable.' };
    }
    return vaultWriteService.renameFile(payload);
  });
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_PROFILE, () => callVaultProfileService(vaultProfileService, 'getProfile'));
  ipcMain.handle(IPC_CHANNELS.VAULT_SET_PROFILE_ROLE, (_event, payload) => callVaultProfileService(vaultProfileService, 'setRole', payload));
  ipcMain.handle(IPC_CHANNELS.VAULT_RESET_PROFILE_ROLE, (_event, payload) => callVaultProfileService(vaultProfileService, 'resetRole', payload));
  ipcMain.handle(IPC_CHANNELS.VAULT_SET_PROFILE_APPEARANCE, (_event, payload) => callVaultProfileService(vaultProfileService, 'setAppearance', payload));
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST_PROFILE_ICONS, () => callVaultProfileService(vaultProfileService, 'listLocalIcons'));
  ipcMain.handle(IPC_CHANNELS.VAULT_GET_INVENTORY, () => callVaultInventoryService(vaultInventoryService));
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST_RECENT_FILES, () => callVaultRecentFilesService(vaultRecentFilesService, 'list'));
  ipcMain.handle(IPC_CHANNELS.VAULT_RECORD_RECENT_FILE, (_event, payload) => callVaultRecentFilesService(vaultRecentFilesService, 'record', payload));
  ipcMain.handle(IPC_CHANNELS.VAULT_LOAD_REVIEW_BASKET, () => callVaultReviewBasketService(vaultReviewBasketService, 'load'));
  ipcMain.handle(IPC_CHANNELS.VAULT_SAVE_REVIEW_BASKET, (_event, payload) => callVaultReviewBasketService(vaultReviewBasketService, 'save', payload));
}

function callVaultInventoryService(service) {
  if (!service || typeof service.getInventory !== 'function') {
    return { ok: false, code: 'inventory_unavailable', message: 'Vault inventory service unavailable.' };
  }
  return service.getInventory();
}

function callVaultRecentFilesService(service, method, payload) {
  if (!service || typeof service[method] !== 'function') {
    return { ok: false, code: 'recent_files_unavailable', message: 'Recent files service unavailable.' };
  }
  return service[method](payload);
}

function callVaultReviewBasketService(service, method, payload) {
  if (!service || typeof service[method] !== 'function') {
    return { ok: false, code: 'review_basket_unavailable', message: 'Review Basket cache unavailable.' };
  }
  return service[method](payload);
}

function callVaultProfileService(service, method, payload) {
  if (!service || typeof service[method] !== 'function') {
    return { ok: false, code: 'vault_profile_unavailable', message: 'Vault profile service unavailable.' };
  }
  return service[method](payload);
}

function activateVaultRoot(coordinator, vaultRoot, source) {
  if (!coordinator || typeof coordinator.activateRoot !== 'function') {
    return { ok: false, code: 'vault_session_unavailable', message: 'Vault session coordinator unavailable.' };
  }
  return coordinator.activateRoot(vaultRoot, { source });
}

module.exports = {
  registerVaultIpc
};
