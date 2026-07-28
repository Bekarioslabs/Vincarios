(function() {
  'use strict';

  function createIndexSettingsController(options) {
    options = options || {};
    const panel = options.panel;
    const api = options.api;
    const rerender = typeof options.rerender === 'function' ? options.rerender : async () => {};
    const similaritySourceOptions = options.similaritySourceOptions || getBrowserSimilaritySourceOptions();

    function subscribe() {
      if (!api || !api.indexes || typeof api.indexes.onHealthChanged !== 'function') return () => {};
      return api.indexes.onHealthChanged((health) => applyVaultIndexStatus(health));
    }

    async function render(settings) {
      renderEmbeddingSettings(settings);
      await renderVaultIndexStatus();
    }

    function renderEmbeddingSettings(settings) {
      const embeddings = settings && settings.embeddings ? settings.embeddings : {};
      const similarNotes = embeddings.similarNotes || {};
      if (!panel.embeddingsGrid) return;
      panel.embeddingsGrid.innerHTML = '';
      panel.embeddingsGrid.appendChild(createEmbeddingModeField(similarNotes.mode || 'mixed'));
      panel.embeddingsGrid.appendChild(createEmbeddingNumberField(
        'Minimum match %',
        'minimumScorePercent',
        similarNotes.minimumScorePercent || 65,
        { min: 0, max: 100 }
      ));
      panel.embeddingsGrid.appendChild(createEmbeddingNumberField(
        'Max results',
        'maxResults',
        similarNotes.maxResults || 8,
        { min: 1 }
      ));

      if (panel.saveEmbeddingsButton && !panel.saveEmbeddingsButton.dataset.bound) {
        panel.saveEmbeddingsButton.dataset.bound = 'true';
        panel.saveEmbeddingsButton.addEventListener('click', async () => {
          const similarity = similaritySourceOptions.weightsFor(readEmbeddingMode(panel.embeddingsGrid, 'mixed'));
          const payload = {
            similarNotes: {
              mode: similarity.mode,
              minimumScorePercent: readEmbeddingValue(panel.embeddingsGrid, 'minimumScorePercent', '65'),
              contentWeight: similarity.contentWeight,
              metadataWeight: similarity.metadataWeight,
              maxResults: readEmbeddingValue(panel.embeddingsGrid, 'maxResults', '8')
            }
          };
          setText(panel.status, 'Saving embedding defaults...');
          const result = await safeCall(() => api.settings.setEmbeddings(payload));
          if (!result || result.ok === false) {
            setText(panel.status, result && result.message ? result.message : 'Could not save embedding defaults.');
            return;
          }
          setText(panel.status, 'Embedding defaults saved.');
          panel.eventTarget.dispatchEvent(new CustomEvent('vincarios:embedding-similar-defaults-change'));
          await rerender(result.settings || settings);
        });
      }
    }

    async function renderVaultIndexStatus() {
      const statusResult = api && api.indexes && typeof api.indexes.getHealth === 'function'
        ? await safeCall(() => api.indexes.getHealth())
        : null;
      applyVaultIndexStatus(statusResult);
      bindFullTextIndexActions();

      if (panel.refreshVaultIndexesButton && !panel.refreshVaultIndexesButton.dataset.bound) {
        panel.refreshVaultIndexesButton.dataset.bound = 'true';
        panel.refreshVaultIndexesButton.addEventListener('click', async () => {
          if (!api || !api.indexes || typeof api.indexes.refresh !== 'function') return;
          panel.refreshVaultIndexesButton.disabled = true;
          setText(panel.vaultIndexStatus, 'Refreshing vault indexes...');
          const result = await safeCall(() => api.indexes.refresh());
          if (!result || result.ok === false) {
            setText(panel.vaultIndexStatus, result && result.message ? result.message : 'Could not refresh vault indexes.');
            panel.refreshVaultIndexesButton.disabled = false;
            return;
          }
          applyVaultIndexStatus(await safeCall(() => api.indexes.getHealth()));
        });
      }
    }

    function applyVaultIndexStatus(result) {
      const status = result && result.ok !== false ? result : null;
      const state = status && status.state ? status.state : 'unavailable';
      const messages = {
        no_vault: 'Open a vault to inspect its index.',
        no_index: 'No index yet.',
        ready: 'Vault indexes are ready.',
        stale: 'Index needs refresh after vault changes.',
        indexing: 'Vault indexes are updating.',
        rebuild_required: 'Vault indexes require refresh.',
        unavailable: 'Embedding model unavailable. Metadata index remains available.',
        invalid: 'Vault indexes could not be read.'
      };
      const labels = {
        no_index: 'Refresh indexes',
        ready: 'Refresh indexes',
        stale: 'Refresh indexes',
        rebuild_required: 'Refresh indexes',
        invalid: 'Refresh indexes'
      };
      if (panel.vaultIndexStatus) panel.vaultIndexStatus.dataset.indexState = state;
      setText(panel.vaultIndexStatus, messages[state] || 'Vault index status unavailable.');
      const metadataCount = Number(status && status.metadata && status.metadata.documentCount) || 0;
      const embeddingDocumentCount = Number(status && status.embeddings && status.embeddings.documentCount) || 0;
      const chunkCount = Number(status && status.embeddings && status.embeddings.chunkCount) || 0;
      const counts = [];
      if (state === 'ready' || state === 'stale' || state === 'rebuild_required') {
        counts.push(Math.max(metadataCount, embeddingDocumentCount) + ' Markdown notes indexed.');
        if (status && status.embeddings && status.embeddings.state !== 'unavailable') {
          counts.push(chunkCount + ' Similar Notes text segments.');
        }
      }
      setText(panel.vaultIndexCounts, counts.join(' '));
      applyFullTextIndexStatus(status && status.fullText ? status.fullText : null);
      if (!panel.refreshVaultIndexesButton) return;
      panel.refreshVaultIndexesButton.textContent = labels[state] || 'Index unavailable';
      panel.refreshVaultIndexesButton.disabled = !status || status.canRefresh !== true;
    }

    function bindFullTextIndexActions() {
      if (panel.fullTextEnabledInput && !panel.fullTextEnabledInput.dataset.bound) {
        panel.fullTextEnabledInput.dataset.bound = 'true';
        panel.fullTextEnabledInput.addEventListener('change', async () => {
          if (!api || !api.indexes || typeof api.indexes.setFullTextEnabled !== 'function') return;
          panel.fullTextEnabledInput.disabled = true;
          const result = await safeIndexCall(() => api.indexes.setFullTextEnabled(panel.fullTextEnabledInput.checked));
          applyVaultIndexStatus(await safeIndexCall(() => api.indexes.getHealth()));
          if (!result || result.ok === false) {
            setText(panel.fullTextIndexStatus, result && result.message
              ? result.message
              : 'Could not update full-text index setting.');
          }
        });
      }

      if (panel.deleteFullTextButton && !panel.deleteFullTextButton.dataset.bound) {
        panel.deleteFullTextButton.dataset.bound = 'true';
        panel.deleteFullTextButton.addEventListener('click', async () => {
          if (!api || !api.indexes || typeof api.indexes.deleteFullText !== 'function') return;
          panel.deleteFullTextButton.disabled = true;
          setText(panel.fullTextIndexStatus, 'Removing local full-text index...');
          const result = await safeIndexCall(() => api.indexes.deleteFullText());
          applyVaultIndexStatus(await safeIndexCall(() => api.indexes.getHealth()));
          if (!result || result.ok === false) {
            setText(panel.fullTextIndexStatus, result && result.message
              ? result.message
              : 'Could not remove full-text index.');
          }
        });
      }
    }

    function applyFullTextIndexStatus(status) {
      if (!panel.fullTextIndexStatus) return;
      const state = status && status.state ? status.state : 'no_vault';
      const messages = {
        no_vault: 'Open a vault to configure full-text search.',
        disabled: 'Disabled. Enable it to build an exact-match index.',
        no_index: 'No local search index yet.',
        ready: 'Full-text search index is ready.',
        stale: 'Full-text search index needs refresh.',
        indexing: 'Full-text search index is updating.',
        invalid: 'Full-text search index could not be read.'
      };
      panel.fullTextIndexStatus.dataset.indexState = state;
      setText(panel.fullTextIndexStatus, messages[state] || 'Full-text search status unavailable.');
      setText(panel.fullTextIndexDisclosure, state === 'disabled'
        ? status && status.cacheExists
          ? 'Disabled. A retained local cache can be deleted below or reused after enabling.'
          : 'Enable once to store normalized terms and heading references in .vincarios/index/search/. Original Markdown content is not copied.'
        : state === 'no_index'
          ? 'Search is enabled. Build the local index to make it available.'
          : 'Local cache: ' + (Number(status && status.documentCount) || 0) + ' notes, '
            + (Number(status && status.termCount) || 0) + ' terms.');
      if (panel.fullTextEnabledInput) {
        panel.fullTextEnabledInput.checked = status && status.enabled === true;
        panel.fullTextEnabledInput.disabled = state === 'no_vault' || state === 'indexing';
      }
      if (panel.deleteFullTextButton) {
        panel.deleteFullTextButton.hidden = state === 'no_vault'
          || state === 'no_index'
          || (state === 'disabled' && !(status && status.cacheExists));
        panel.deleteFullTextButton.disabled = state === 'indexing';
      }
    }

    function createEmbeddingNumberField(labelText, key, value, fieldOptions) {
      fieldOptions = fieldOptions || {};
      const label = document.createElement('label');
      label.className = 'settings-limit-field';
      label.innerHTML = '<span></span><input type="number" step="1" data-settings-embedding>';
      label.querySelector('span').textContent = labelText;
      const input = label.querySelector('input');
      input.setAttribute('data-embedding-key', key);
      if (fieldOptions.min !== undefined) input.setAttribute('min', String(fieldOptions.min));
      if (fieldOptions.max !== undefined) input.setAttribute('max', String(fieldOptions.max));
      input.value = String(value);
      return label;
    }

    function createEmbeddingModeField(value) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'settings-limit-field settings-embedding-source';
      fieldset.dataset.settingsEmbeddingSource = '';
      const legend = document.createElement('legend');
      legend.textContent = 'Search source';
      fieldset.appendChild(legend);
      const selected = similaritySourceOptions.normalize(value);
      similaritySourceOptions.options().forEach((source) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'settings-embedding-source';
        input.value = source.value;
        input.checked = source.value === selected;
        label.appendChild(input);
        label.appendChild(document.createTextNode(source.label));
        fieldset.appendChild(label);
      });
      return fieldset;
    }

    function readEmbeddingMode(root, fallback) {
      const selected = root.querySelector('[data-settings-embedding-source] input:checked');
      return similaritySourceOptions.normalize(selected && selected.value ? selected.value : fallback);
    }

    function readEmbeddingValue(root, key, fallback) {
      const input = root.querySelector('[data-embedding-key="' + key + '"]');
      return input ? input.value : fallback;
    }

    return Object.freeze({
      subscribe,
      render,
      applyVaultIndexStatus
    });
  }

  function getBrowserSimilaritySourceOptions() {
    if (typeof window !== 'undefined' && window.VincariosSimilaritySourceOptions) {
      return window.VincariosSimilaritySourceOptions;
    }
    throw new Error('Similarity source options unavailable.');
  }

  async function safeCall(callback) {
    try {
      return await callback();
    } catch (_error) {
      return null;
    }
  }

  async function safeIndexCall(callback) {
    try {
      return await callback();
    } catch (error) {
      return {
        ok: false,
        code: 'index_request_failed',
        message: error && error.message ? error.message : 'Index request failed.'
      };
    }
  }

  function setText(node, value) {
    if (node) node.textContent = value || '';
  }

  const api = { createIndexSettingsController };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosIndexSettings = Object.freeze(api);
})();
