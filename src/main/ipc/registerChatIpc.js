'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerChatIpc(ipcMain, chatService) {
  if (!chatService || typeof chatService.sendChat !== 'function') {
    throw new Error('Chat service is required.');
  }

  const pendingRequests = new Map();

  ipcMain.handle(IPC_CHANNELS.CHAT_CHECK_UPDATE_BUDGET, (_event, payload) => {
    if (typeof chatService.checkUpdateBudget !== 'function') {
      return { ok: false, code: 'update_budget_unknown', error: 'Context check unavailable. Restart Vincarios.', budget: { state: 'unknown' } };
    }
    return chatService.checkUpdateBudget(payload);
  });

  ipcMain.handle(IPC_CHANNELS.CHAT_SEND, async (event, payload) => {
    payload = payload || {};
    const requestId = normalizeRequestId(payload.requestId);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (requestId && controller) pendingRequests.set(requestId, controller);

    try {
      return await chatService.sendChat(payload, {
        requestId,
        signal: controller ? controller.signal : undefined
      });
    } finally {
      if (requestId) pendingRequests.delete(requestId);
    }
  });

  ipcMain.handle(IPC_CHANNELS.CHAT_CANCEL, (event, payload) => {
    const requestId = normalizeRequestId(payload && payload.requestId);
    if (!requestId) return { ok: false, code: 'missing_request_id', message: 'Request id is required.' };
    const controller = pendingRequests.get(requestId);
    if (!controller) return { ok: false, code: 'request_not_found', requestId, message: 'Request is no longer running.' };
    controller.abort();
    pendingRequests.delete(requestId);
    return { ok: true, requestId };
  });
}

function normalizeRequestId(value) {
  return String(value || '').trim();
}

module.exports = {
  registerChatIpc,
  normalizeRequestId
};
