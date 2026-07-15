'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerVaultIpc(ipcMain, dialog, browserWindow, vaultReadService, vaultWriteService, embeddingService, vaultProfileService) {
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

    const readResult = setVaultRoot(result.filePaths[0], vaultReadService, vaultWriteService, embeddingService, vaultProfileService);
    return readResult;
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_SET_ROOT, (_event, vaultRoot) => {
    const readResult = setVaultRoot(vaultRoot, vaultReadService, vaultWriteService, embeddingService, vaultProfileService);
    return readResult;
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
}

function callVaultProfileService(service, method, payload) {
  if (!service || typeof service[method] !== 'function') {
    return { ok: false, code: 'vault_profile_unavailable', message: 'Vault profile service unavailable.' };
  }
  return service[method](payload);
}

function setVaultRoot(vaultRoot, vaultReadService, vaultWriteService, embeddingService, vaultProfileService) {
  const readResult = vaultReadService.setRoot(vaultRoot);
  if (readResult.ok) {
    syncDependentRoot(vaultRoot, vaultWriteService, embeddingService, vaultProfileService);
  }
  return readResult;
}

function syncDependentRoot(vaultRoot, vaultWriteService, embeddingService, vaultProfileService) {
  if (vaultWriteService && typeof vaultWriteService.setRoot === 'function') {
    vaultWriteService.setRoot(vaultRoot);
  }
  if (embeddingService && typeof embeddingService.setRoot === 'function') {
    embeddingService.setRoot(vaultRoot);
  }
  if (vaultProfileService && typeof vaultProfileService.setRoot === 'function') {
    vaultProfileService.setRoot(vaultRoot);
  }
}

module.exports = {
  registerVaultIpc
};
