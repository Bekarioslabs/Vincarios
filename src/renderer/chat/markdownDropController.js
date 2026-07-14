(function() {
  'use strict';

  const DEFAULT_DROP_FOLDER = 'External Drops';
  const DEFAULT_IMPORT_FOLDER = '00_Inbox';

  function mountMarkdownDropController(options) {
    options = options || {};
    const chatLog = options.chatLog;
    const contextState = options.contextState;
    const reviewBasket = options.reviewBasket;
    const status = options.status;
    const appendMessage = typeof options.appendMessage === 'function' ? options.appendMessage : null;
    if (!chatLog || !contextState || typeof contextState.addContextItem !== 'function') return null;

    function onDragOver(event) {
      if (!hasFileTransfer(event.dataTransfer)) return;
      event.preventDefault();
      chatLog.classList.add('chat-log-drag-over');
    }

    function onDragLeave(event) {
      if (event.currentTarget === chatLog) chatLog.classList.remove('chat-log-drag-over');
    }

    async function onDrop(event) {
      if (!hasFileTransfer(event.dataTransfer)) return;
      event.preventDefault();
      chatLog.classList.remove('chat-log-drag-over');
      const files = Array.from((event.dataTransfer && event.dataTransfer.files) || []).filter(isMarkdownDropFile);
      if (!files.length) {
        setText(status, 'Only Markdown files can be dropped into chat in V1.');
        return;
      }

      for (const file of files) {
        await handleDroppedMarkdownFile({ file, contextState, reviewBasket, status, appendMessage });
      }
    }

    chatLog.addEventListener('dragover', onDragOver);
    chatLog.addEventListener('dragleave', onDragLeave);
    chatLog.addEventListener('drop', onDrop);

    return Object.freeze({
      destroy() {
        chatLog.removeEventListener('dragover', onDragOver);
        chatLog.removeEventListener('dragleave', onDragLeave);
        chatLog.removeEventListener('drop', onDrop);
      }
    });
  }

  async function handleDroppedMarkdownFile(options) {
    const file = options.file;
    const content = await readDroppedFileText(file);
    const drop = {
      name: file.name,
      path: file.path || file.name,
      content
    };
    const item = createDroppedMarkdownContextItem(drop);
    options.contextState.addContextItem(item);
    if (typeof options.appendMessage === 'function') {
      options.appendMessage('assistant', formatDropMessage(drop), {
        allowSave: false,
        actions: [{
          label: 'Import to Inbox',
          onClick: () => addImportProposal(options.reviewBasket, options.status, drop)
        }]
      });
    }
    setText(options.status, 'Dropped Markdown added as temporary context.');
    return item;
  }

  function addImportProposal(reviewBasket, status, drop) {
    if (!reviewBasket || typeof reviewBasket.addProposal !== 'function') {
      setText(status, 'Review Basket unavailable.');
      return null;
    }
    const proposal = createImportProposalFromDrop(drop);
    const item = reviewBasket.addProposal(proposal);
    setText(status, item && item.duplicate ? 'Import proposal already exists.' : 'Import proposal added to Review Basket.');
    return item;
  }

  function hasFileTransfer(dataTransfer) {
    const files = Array.from((dataTransfer && dataTransfer.files) || []);
    if (files.length) return true;
    const types = Array.from((dataTransfer && dataTransfer.types) || []);
    return types.includes('Files');
  }

  function hasMarkdownFile(dataTransfer) {
    const files = Array.from((dataTransfer && dataTransfer.files) || []);
    return files.some(isMarkdownDropFile);
  }

  function isMarkdownDropFile(file) {
    const name = String((file && file.name) || '').toLowerCase();
    return /\.(md|markdown)$/.test(name);
  }

  function createDroppedMarkdownContextItem(drop) {
    const name = sanitizeFileName(drop && drop.name ? drop.name : 'Dropped.md');
    return {
      kind: 'file',
      path: DEFAULT_DROP_FOLDER + '/' + name,
      content: String((drop && drop.content) || ''),
      source: 'dropped_markdown',
      externalPath: String((drop && drop.path) || '')
    };
  }

  function createImportProposalFromDrop(drop) {
    const name = sanitizeFileName(drop && drop.name ? drop.name : 'Dropped.md');
    const metadataApi = getGeneratedMetadataApi();
    const generated = metadataApi.applyGeneratedNoteMetadata(String((drop && drop.content) || ''), {
      originAction: metadataApi.ORIGIN_ACTIONS.importMarkdown
    });
    return {
      type: 'create_note',
      category: 'create',
      title: stripMarkdownExtension(name),
      targetFolder: resolveInboxFolder(drop && drop.profile),
      content: generated.content,
      metadata: generated.metadata,
      originAction: metadataApi.ORIGIN_ACTIONS.importMarkdown,
      reason: 'Import external Markdown drop into the Inbox through reviewed creation.',
      risk: 'low'
    };
  }

  function getGeneratedMetadataApi() {
    if (typeof window !== 'undefined' && window.VitruviosGeneratedNoteMetadata) return window.VitruviosGeneratedNoteMetadata;
    if (typeof require === 'function') return require('../../shared/metadata/generatedNoteMetadata');
    throw new Error('Generated note metadata API unavailable.');
  }

  function resolveInboxFolder(profile) {
    const profileApi = getVaultProfileApi();
    if (!profileApi || !profileApi.FOLDER_ROLES || typeof profileApi.joinFolderRolePath !== 'function') return DEFAULT_IMPORT_FOLDER;
    return profileApi.joinFolderRolePath(profile, profileApi.FOLDER_ROLES.inbox);
  }

  function getVaultProfileApi() {
    if (typeof window !== 'undefined' && window.VitruviosVaultProfile) return window.VitruviosVaultProfile;
    if (typeof require === 'function') {
      try {
        return require('../../shared/vaultProfile/defaults');
      } catch (error) {}
    }
    return null;
  }
  function formatDropMessage(drop) {
    const name = sanitizeFileName(drop && drop.name ? drop.name : 'Dropped.md');
    return 'Added `' + name + '` as temporary context. Use `Import to Inbox` if you want to copy it into the vault.';
  }

  function readDroppedFileText(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new Error('FileReader is unavailable.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Could not read dropped file.'));
      reader.readAsText(file);
    });
  }

  function sanitizeFileName(value) {
    const name = String(value || 'Dropped.md')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .pop()
      .replace(/[<>:"|?*\x00-\x1f]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[. ]+$/g, '')
      .trim() || 'Dropped.md';
    return /\.(md|markdown)$/i.test(name) ? name : name + '.md';
  }

  function stripMarkdownExtension(value) {
    return String(value || 'Dropped.md').replace(/\.(md|markdown)$/i, '').trim() || 'Dropped';
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = {
    mountMarkdownDropController,
    handleDroppedMarkdownFile,
    hasFileTransfer,
    isMarkdownDropFile,
    createDroppedMarkdownContextItem,
    createImportProposalFromDrop,
    formatDropMessage
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownDropController = Object.freeze(api);
})();