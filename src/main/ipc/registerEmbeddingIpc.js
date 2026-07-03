'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerEmbeddingIpc(ipcMain, embeddingSearchService) {
  ipcMain.handle(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES, (_event, payload) => {
    if (!embeddingSearchService || typeof embeddingSearchService.findSimilarNotes !== 'function') {
      return { ok: false, code: 'embeddings_unavailable', message: 'Embedding search service unavailable.' };
    }
    const targetPath = payload && payload.targetPath;
    const options = {
      limit: payload && payload.limit,
      minimumScorePercent: payload && payload.minimumScorePercent,
      mode: payload && payload.mode,
      contentWeight: payload && payload.contentWeight,
      metadataWeight: payload && payload.metadataWeight,
      refreshIndex: payload && payload.refreshIndex
    };
    return embeddingSearchService.findSimilarNotes(targetPath, options);
  });
}

module.exports = {
  registerEmbeddingIpc
};
