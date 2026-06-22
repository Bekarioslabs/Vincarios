'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerVaultIpc(ipcMain, dialog, browserWindow, vaultReadService) {
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

    return vaultReadService.setRoot(result.filePaths[0]);
  });

  ipcMain.handle(IPC_CHANNELS.VAULT_SET_ROOT, (_event, vaultRoot) => vaultReadService.setRoot(vaultRoot));
  ipcMain.handle(IPC_CHANNELS.VAULT_LIST_FOLDER, (_event, relativePath) => vaultReadService.listFolder(relativePath));
  ipcMain.handle(IPC_CHANNELS.VAULT_READ_MARKDOWN, (_event, relativePath) => vaultReadService.readMarkdown(relativePath));
}

module.exports = {
  registerVaultIpc
};