'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerTemplateIpc(ipcMain, reviewedTemplateService) {
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_CREATE_FROM_REVIEW, (_event, payload) => {
    if (!reviewedTemplateService || typeof reviewedTemplateService.createFromReview !== 'function') {
      return {
        ok: false,
        code: 'template_service_unavailable',
        message: 'Reviewed template service unavailable.'
      };
    }
    return reviewedTemplateService.createFromReview(payload);
  });
}

module.exports = { registerTemplateIpc };
