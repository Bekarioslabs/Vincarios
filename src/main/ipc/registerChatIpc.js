'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerChatIpc(ipcMain, chatService) {
  if (!chatService || typeof chatService.sendChat !== 'function') {
    throw new Error('Chat service is required.');
  }

  ipcMain.handle(IPC_CHANNELS.CHAT_SEND, (event, payload) => chatService.sendChat(payload));
}

module.exports = {
  registerChatIpc
};