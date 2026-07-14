(function() {
  'use strict';

  function mountInboxCleanup(options) {
    options = options || {};
    const app = options.app;
    const api = options.api;
    const status = options.status;
    if (!app) return null;

    const button = app.querySelector('[data-inbox-review]');
    const chatLog = app.querySelector('#chat-log');
    if (!button || !chatLog) return null;

    button.disabled = false;
    button.classList.remove('left-button-placeholder');
    button.addEventListener('click', () => runInboxCleanupReport({ api, chatLog, status }));
    return Object.freeze({ runInboxCleanupReport: () => runInboxCleanupReport({ api, chatLog, status }) });
  }

  async function runInboxCleanupReport(options) {
    options = options || {};
    const api = options.api;
    const chatLog = options.chatLog;
    const status = options.status;
    const mode = options.mode === 'nested' ? 'nested' : 'direct';
    const inboxPath = getInboxPath();

    if (!api || !api.vault || typeof api.vault.listFolder !== 'function') {
      appendReportMessage(chatLog, 'Inbox cleanup failed: vault API unavailable.', { allowSave: false });
      setText(status, 'Inbox cleanup failed.');
      return { ok: false, code: 'vault_api_unavailable' };
    }

    setText(status, mode === 'nested' ? 'Scanning nested inbox folders...' : 'Building inbox cleanup report...');
    const result = await api.vault.listFolder(inboxPath);
    if (!result || !result.ok) {
      const message = 'Inbox cleanup failed: ' + ((result && (result.message || result.code)) || 'Could not list inbox.');
      appendReportMessage(chatLog, message, { allowSave: false });
      setText(status, 'Inbox cleanup failed.');
      return Object.assign({ ok: false }, result || {}, { inboxPath });
    }

    const reportApi = getReportApi();
    if (!reportApi) {
      appendReportMessage(chatLog, 'Inbox cleanup failed: report module unavailable.', { allowSave: false });
      setText(status, 'Inbox cleanup failed.');
      return { ok: false, code: 'report_unavailable', inboxPath };
    }

    const childEntriesByFolder = mode === 'nested'
      ? await collectNestedFolderEntries(api.vault, result.entries || [])
      : await collectDirectChildFolderEntries(api.vault, result.entries || []);
    const report = reportApi.buildInboxCleanupReport({ inboxPath, entries: result.entries || [], childEntriesByFolder });
    const markdown = reportApi.formatInboxCleanupReportMarkdown(report);
    const actions = mode === 'nested' ? [] : [{
      label: 'Scan nested folders',
      onClick: () => runInboxCleanupReport({ api, chatLog, status, mode: 'nested' })
    }];
    appendReportMessage(chatLog, markdown, { allowSave: true, suggestedTitle: 'Inbox Cleanup Report', responseSubfolder: 'Cleanup Reports', actions });
    setText(status, mode === 'nested' ? 'Nested inbox cleanup report ready.' : 'Inbox cleanup report ready.');
    return { ok: true, report };
  }

  async function collectDirectChildFolderEntries(vaultApi, entries) {
    const folders = (Array.isArray(entries) ? entries : []).filter(isFolderEntry);
    const childEntriesByFolder = {};
    for (const folder of folders) {
      const folderPath = normalizePath(folder.path);
      if (!folderPath) continue;
      const result = await vaultApi.listFolder(folderPath);
      if (result && result.ok) childEntriesByFolder[folderPath] = result.entries || [];
    }
    return childEntriesByFolder;
  }

  async function collectNestedFolderEntries(vaultApi, entries) {
    const childEntriesByFolder = {};
    const queue = (Array.isArray(entries) ? entries : []).filter(isFolderEntry).map((entry) => normalizePath(entry.path)).filter(Boolean);
    const seen = new Set();
    while (queue.length > 0) {
      const folderPath = queue.shift();
      if (!folderPath || seen.has(folderPath)) continue;
      seen.add(folderPath);
      const result = await vaultApi.listFolder(folderPath);
      if (!result || !result.ok) continue;
      const childEntries = result.entries || [];
      childEntriesByFolder[folderPath] = childEntries;
      childEntries.filter(isFolderEntry).forEach((entry) => {
        const childPath = normalizePath(entry.path);
        if (childPath && !seen.has(childPath)) queue.push(childPath);
      });
    }
    return childEntriesByFolder;
  }

  function isFolderEntry(entry) {
    const kind = String((entry && (entry.kind || entry.type)) || '').toLowerCase();
    return kind === 'folder' || kind === 'directory' || kind === 'dir' || entry && entry.isDirectory === true;
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/').trim();
  }

  function getInboxPath() {
    const profileApi = typeof window !== 'undefined' ? window.VitruviosVaultProfile : null;
    if (profileApi && typeof profileApi.getFolderRolePath === 'function' && profileApi.FOLDER_ROLES) {
      try {
        return profileApi.getFolderRolePath(profileApi.DEFAULT_VAULT_PROFILE, profileApi.FOLDER_ROLES.inbox);
      } catch (error) {
        return '00_Inbox';
      }
    }
    return '00_Inbox';
  }

  function getReportApi() {
    return typeof window !== 'undefined' ? window.VitruviosInboxCleanupReport : null;
  }

  function appendReportMessage(chatLog, content, options) {
    const chatApi = typeof window !== 'undefined' ? window.VitruviosChat : null;
    if (chatApi && typeof chatApi.appendMessage === 'function') {
      return chatApi.appendMessage(chatLog, 'assistant', content, options || {});
    }
    const message = document.createElement('article');
    message.className = 'chat-message chat-message-assistant';
    message.textContent = content;
    chatLog.appendChild(message);
    return message;
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = Object.freeze({ mountInboxCleanup, runInboxCleanupReport });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosInboxCleanup = api;
})();
