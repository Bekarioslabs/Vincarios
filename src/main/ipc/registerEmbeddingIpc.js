'use strict';

const { IPC_CHANNELS } = require('../../shared/ipc/channels');

function registerEmbeddingIpc(ipcMain, embeddingSearchService, embeddingIndexHealthService) {
  ipcMain.handle(IPC_CHANNELS.EMBEDDINGS_GET_INDEX_STATUS, () => {
    if (!embeddingIndexHealthService || typeof embeddingIndexHealthService.getHealth !== 'function') {
      return { ok: false, code: 'embeddings_unavailable', message: 'Embedding index health service unavailable.' };
    }
    return embeddingIndexHealthService.getHealth();
  });

  ipcMain.handle(IPC_CHANNELS.EMBEDDINGS_REFRESH_INDEX, () => {
    if (!embeddingIndexHealthService || typeof embeddingIndexHealthService.refreshIndex !== 'function') {
      return { ok: false, code: 'embeddings_unavailable', message: 'Embedding index health service unavailable.' };
    }
    return embeddingIndexHealthService.refreshIndex();
  });

  ipcMain.handle(IPC_CHANNELS.EMBEDDINGS_FIND_SIMILAR_NOTES, async (_event, payload) => {
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
      scope: payload && payload.scope,
      refreshIndex: payload && payload.refreshIndex
    };
    if (options.refreshIndex) {
      if (!embeddingIndexHealthService || typeof embeddingIndexHealthService.refreshIndex !== 'function') {
        return { ok: false, code: 'embeddings_unavailable', message: 'Embedding index health service unavailable.' };
      }
      const refreshed = await embeddingIndexHealthService.refreshIndex();
      if (!refreshed || !refreshed.ok) return refreshed;
      options.refreshIndex = false;
    }
    return embeddingSearchService.findSimilarNotes(targetPath, options);
  });
}

module.exports = {
  registerEmbeddingIpc
};
