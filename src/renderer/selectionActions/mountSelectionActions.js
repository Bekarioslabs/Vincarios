(function() {
  'use strict';

  function mountSelectionActions(options) {
    options = options || {};
    const api = options.api || {};
    const app = options.app;
    const contextState = options.contextState;
    const status = options.status || null;
    if (!app || !contextState || typeof contextState.snapshot !== 'function') return null;

    const root = app.querySelector('.selection-actions-pane');
    if (!root) return null;

    const unsubscribe = typeof contextState.subscribe === 'function'
      ? contextState.subscribe(render)
      : null;

    render(contextState.snapshot());

    function render(snapshot) {
      root.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'selection-actions-header';
      header.textContent = 'Selection Actions';
      root.appendChild(header);

      if (!snapshot || snapshot.kind === 'none') {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'Select a file or folder.';
        root.appendChild(empty);
        return;
      }

      const target = document.createElement('div');
      target.className = 'selection-actions-target';
      target.textContent = snapshot.path;
      root.appendChild(target);

      const actions = getRegistry().getSelectionActions(snapshot);
      if (!actions.length) {
        const empty = document.createElement('div');
        empty.className = 'selection-actions-empty';
        empty.textContent = 'No actions for this target yet.';
        root.appendChild(empty);
        return;
      }

      actions.forEach((action) => root.appendChild(createActionButton(action, snapshot)));
    }

    function createActionButton(action, snapshot) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-action-button is-' + action.category;
      button.dataset.actionId = action.id;
      button.dataset.actionCategory = action.category;
      if (action.future) button.dataset.futureSlot = action.id;
      button.disabled = action.enabled !== true;
      button.title = action.reason || (action.future ? 'Planned V1 action.' : action.label);

      const category = getCategories().getActionCategory(action.category);
      const tag = document.createElement('span');
      tag.className = 'selection-action-category';
      tag.textContent = category.label;

      const label = document.createElement('span');
      label.className = 'selection-action-label';
      label.textContent = action.label;

      button.appendChild(tag);
      button.appendChild(label);
      button.addEventListener('click', () => runAction(action, snapshot));
      return button;
    }

    function runAction(action, snapshot) {
      if (!action || action.enabled !== true) return;
      if (action.id === 'file.summarize') {
        summarizeFile(snapshot);
        return;
      }
      if (action.id === 'file.useAsContext') {
        contextState.addContextItem({ kind: 'file', path: snapshot.path, content: snapshot.content });
        setText(status, 'Added to Context Basket: ' + snapshot.path);
        return;
      }
      if (action.id === 'folder.useAsContext') {
        contextState.addContextItem({ kind: 'folder', path: snapshot.path });
        setText(status, 'Added folder to Context Basket: ' + snapshot.path);
        return;
      }
      if (action.id === 'folder.listCurrent') {
        listFolder(snapshot);
      }
    }

    async function summarizeFile(snapshot) {
      const summary = getFileSummaryAction();
      if (!summary || typeof summary.buildFileSummaryMessages !== 'function') {
        appendActionMessage('File summary failed: summary action module unavailable.');
        setText(status, 'File summary failed.');
        return;
      }
      if (!api.chat || typeof api.chat.send !== 'function') {
        appendActionMessage('File summary failed: chat provider API unavailable.');
        setText(status, 'File summary failed.');
        return;
      }

      const request = summary.buildFileSummaryMessages(snapshot);
      if (!request.ok) {
        appendActionMessage('File summary unavailable: ' + (request.message || 'Unsupported selection.'));
        setText(status, 'File summary unavailable.');
        return;
      }

      setText(status, 'Summarizing file: ' + request.path);
      const pending = appendActionMessage('Summarizing file: ' + request.path, [], { pending: true });
      try {
        const result = await api.chat.send({ messages: request.messages });
        if (result && result.ok && result.message && result.message.content) {
          removeNode(pending);
          appendActionMessage(result.message.content);
          setText(status, 'File summarized: ' + request.path);
          return;
        }
        removeNode(pending);
        appendActionMessage('File summary failed: ' + ((result && result.error) || 'No response.'));
        setText(status, 'File summary failed.');
      } catch (error) {
        removeNode(pending);
        appendActionMessage('File summary failed: ' + ((error && error.message) || 'request failed'));
        setText(status, 'File summary failed.');
      }
    }

    async function listFolder(snapshot) {
      if (!api.vault || typeof api.vault.listFolder !== 'function') {
        appendActionMessage('Folder listing failed: vault API unavailable.');
        setText(status, 'Folder listing failed.');
        return;
      }
      setText(status, 'Listing folder: ' + snapshot.path);
      const result = await api.vault.listFolder(snapshot.path);
      appendActionMessage(formatFolderListing(snapshot.path, result), [{
        label: 'Check whole tree',
        onClick: () => listFolderTree(snapshot)
      }]);
      setText(status, result && result.ok ? 'Folder listed: ' + snapshot.path : 'Folder listing failed.');
    }

    async function listFolderTree(snapshot) {
      const controller = getFolderController();
      if (!api.vault || !controller || typeof controller.listFolderTree !== 'function' || typeof controller.formatRecursiveFolderListing !== 'function') {
        appendActionMessage('Recursive folder listing failed: folder controller unavailable.');
        setText(status, 'Recursive folder listing failed.');
        return;
      }
      setText(status, 'Listing whole tree: ' + snapshot.path);
      const target = {
        kind: 'folder',
        path: snapshot.path,
        readAllowed: true,
        selectionId: snapshot.selectionId || 0,
        recursive: true
      };
      const result = await controller.listFolderTree(api.vault, target);
      appendActionMessage(controller.formatRecursiveFolderListing(target, result));
      setText(status, 'Whole tree listed: ' + snapshot.path);
    }

    function appendActionMessage(content, actions, options) {
      options = options || {};
      const chatLog = app.querySelector('#chat-log');
      if (!chatLog) return;
      if (typeof window !== 'undefined' && window.ZeusChat && typeof window.ZeusChat.appendMessage === 'function') {
        const message = window.ZeusChat.appendMessage(chatLog, 'assistant', content, { allowSave: false, actions: actions || [] });
        if (options.pending && message) {
          message.classList.add('chat-message-pending');
          message.setAttribute('aria-busy', 'true');
        }
        return message;
      }
      const message = document.createElement('article');
      message.className = 'chat-message chat-message-assistant';
      if (options.pending) {
        message.classList.add('chat-message-pending');
        message.setAttribute('aria-busy', 'true');
      }
      const label = document.createElement('div');
      label.className = 'chat-message-label';
      label.textContent = 'ZEUS';
      const body = document.createElement('div');
      body.className = 'chat-message-body';
      body.textContent = content;
      message.appendChild(label);
      message.appendChild(body);
      const actionList = actions || [];
      if (actionList.length) {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'chat-message-actions';
        actionList.forEach((action) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'chat-message-action-button';
          button.textContent = action.label;
          button.addEventListener('click', action.onClick);
          actionWrapper.appendChild(button);
        });
        message.appendChild(actionWrapper);
      }
      chatLog.appendChild(message);
      chatLog.scrollTop = chatLog.scrollHeight;
      return message;
    }

    function removeNode(node) {
      if (node && typeof node.remove === 'function') node.remove();
    }
    function formatFolderListing(folderPath, result) {
      if (!result || !result.ok) return 'Folder listing failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
      const entries = Array.isArray(result.entries) ? result.entries : [];
      if (!entries.length) return 'Folder listed: ' + folderPath + '\n\nNo supported Markdown folders or files found.';
      return 'Folder listed: ' + folderPath + '\n\n' + entries.map((entry) => (entry.name || entry.path || 'Unnamed') + (entry.kind === 'folder' ? '/' : '')).join('\n');
    }

    return Object.freeze({
      destroy() {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    });
  }

  function formatFolderAnalysis(folderPath, result) {
    if (!result || !result.ok) return 'Folder analysis failed: ' + ((result && (result.message || result.code)) || 'Unknown error.');
    const entries = Array.isArray(result.entries) ? result.entries : [];
    const folders = entries.filter((entry) => entry.kind === 'folder');
    const markdownFiles = entries.filter((entry) => entry.kind === 'file' && /\.md$/i.test(String(entry.name || entry.path || '')));
    const otherEntries = entries.filter((entry) => !folders.includes(entry) && !markdownFiles.includes(entry));
    const names = entries.map((entry) => String(entry.name || entry.path || 'Unnamed'));
    const samples = names.slice(0, 8);

    return [
      'Folder analysis (structure only): ' + folderPath,
      '',
      'This is based on names and entry types only. No Markdown file contents were read.',
      '',
      '- Folders: ' + folders.length,
      '- Markdown files: ' + markdownFiles.length,
      '- Other supported entries: ' + otherEntries.length,
      '',
      samples.length ? 'Name samples:\n' + samples.map((name) => '- ' + name).join('\n') : 'Name samples: none',
      '',
      'Use a file-specific action or add files to context before asking for content-level analysis.'
    ].join('\n');
  }
  function getRegistry() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionRegistry) return window.ZeusSelectionActionRegistry;
    if (typeof module !== 'undefined' && module.exports) return require('./actionRegistry');
    throw new Error('ZEUS selection action registry is not available.');
  }

  function getCategories() {
    if (typeof window !== 'undefined' && window.ZeusSelectionActionCategories) return window.ZeusSelectionActionCategories;
    if (typeof module !== 'undefined' && module.exports) return require('./actionCategories');
    throw new Error('ZEUS selection action categories are not available.');
  }

  function getFileSummaryAction() {
    if (typeof window !== 'undefined' && window.ZeusFileSummaryAction) return window.ZeusFileSummaryAction;
    if (typeof module !== 'undefined' && module.exports) return require('./fileSummaryAction');
    return null;
  }
  function getFolderController() {
    if (typeof window !== 'undefined' && window.ZeusFolderContextController) return window.ZeusFolderContextController;
    if (typeof module !== 'undefined' && module.exports) return require('../context/folderContextController');
    return null;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountSelectionActions, formatFolderAnalysis };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusSelectionActions = Object.freeze(api);
})();
