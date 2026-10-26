(function() {
  'use strict';

  function mountFilePanel(options) {
    options = options || {};
    const api = options.api;
    const root = options.root;
    const previewController = options.previewController || null;
    const status = options.status;
    const activityReporter = options.activityReporter || null;
    const context = options.context;
    const contextState = options.contextState || null;
    const permissionState = options.permissionState || null;
    const updateFlashState = options.updateFlashState || null;
    const vaultProfileState = options.vaultProfileState || null;
    const onToggleCollapse = typeof options.onToggleCollapse === 'function' ? options.onToggleCollapse : null;
    const onRequestExpand = typeof options.onRequestExpand === 'function' ? options.onRequestExpand : null;
    const onRecentFileRecorded = typeof options.onRecentFileRecorded === 'function' ? options.onRecentFileRecorded : null;
    const navigator = options.navigator || window.VincariosFileNavigator.createFileNavigator();
    const keyboard = options.keyboard || window.VincariosFileTreeKeyboard || null;
    const entriesByFolder = new Map();
    const loadingFolders = new Set();
    const visibleRows = new Map();
    const visibleEntries = new Map();
    let activeRename = null;
    let treeRefreshInFlight = false;
    let treeRefreshPending = false;
    let activeVault = { root: '' };

    if (!root) return null;

    root.innerHTML = [
      '<div class="file-toolbar ui-panel-header">',
      '  <div class="file-title-wrap">',
      '    <div class="file-label ui-panel-header-label">Files</div>',
      '    <div id="file-vault-name" class="file-vault-name">No vault</div>',
      '  </div>',
      '  <span id="file-index-health" class="file-index-health" data-file-index-health role="status" aria-live="polite" aria-label="Vault index status" title="Vault index status"><span class="file-index-health-dot" aria-hidden="true"></span></span>',
      '  <button id="file-refresh" class="file-refresh-button ui-tool-button" type="button" disabled title="Refresh file tree" aria-label="Refresh file tree"></button>',
      '  <button id="file-collapse" class="file-collapse-button ui-tool-button" type="button" data-files-collapse-toggle aria-label="Collapse Files" title="Collapse Files" aria-expanded="true" aria-controls="file-tree"></button>',
      '</div>',
      '<div id="file-breadcrumb" class="file-breadcrumb">Vault root</div>',
      '<div id="file-tree" class="file-tree muted">Open a vault to list files.</div>'
    ].join('');

    const refreshButton = root.querySelector('#file-refresh');
    const indexHealth = root.querySelector('#file-index-health');
    const collapseButton = root.querySelector('#file-collapse');
    const breadcrumb = root.querySelector('#file-breadcrumb');
    const tree = root.querySelector('#file-tree');
    const vaultName = root.querySelector('#file-vault-name');
    const treeRenderer = getFileTreeRenderer().createFileTreeRenderer({
      tree, navigator, entriesByFolder, loadingFolders, visibleRows, visibleEntries, keyboard,
      updateNavigation, normalizePath, formatRowAriaLabel,
      createEntryIcon: createFileRowIcon,
      createPermissionControls, applyFlashClass, focusTreeRow, activateEntry,
      startInlineRename, handlePermissionHotkey, handleTreeKeydown
    });

    attachRefreshIcon();
    setCollapsed(false);
    refreshButton.addEventListener('click', refreshTree);
    tree.addEventListener('keydown', handleFileTreeRenameShortcut);
    if (collapseButton) {
      collapseButton.addEventListener('click', () => {
        if (onToggleCollapse) onToggleCollapse();
      });
    }
    subscribeToUpdateFlashState();
    subscribeToVaultProfileState();
    subscribeToIndexHealth();
    subscribeToVaultChanges();
    loadIndexHealth();

    function renderIndexHealth(result) {
      if (!indexHealth) return;
      const health = result && result.ok !== false ? result : null;
      const state = health && health.state ? health.state : 'unavailable';
      const messages = {
        no_vault: 'Open a vault to inspect its index.',
        no_index: 'Vault indexes not built.',
        ready: 'Vault indexes ready.',
        stale: 'Vault indexes need refresh.',
        rebuild_required: 'Vault indexes require rebuild.',
        indexing: 'Vault indexes are updating.',
        unavailable: 'Vault index service unavailable.',
        invalid: 'Vault indexes invalid. Rebuild required.'
      };
      const message = messages[state] || 'Vault index status unavailable.';
      indexHealth.dataset.indexState = state;
      indexHealth.setAttribute('aria-label', message);
      indexHealth.title = message;
    }

    async function loadIndexHealth() {
      if (!api || !api.indexes || typeof api.indexes.getHealth !== 'function') {
        renderIndexHealth(null);
        return;
      }
      try {
        renderIndexHealth(await api.indexes.getHealth());
      } catch (error) {
        renderIndexHealth(null);
      }
    }

    function subscribeToIndexHealth() {
      if (!api || !api.indexes || typeof api.indexes.onHealthChanged !== 'function') return;
      api.indexes.onHealthChanged(renderIndexHealth);
    }

    function subscribeToVaultChanges() {
      if (!api || !api.vault || typeof api.vault.onChanged !== 'function') return;
      api.vault.onChanged(async (change) => {
        const session = activeVault;
        if (change && change.root && session.root && change.root !== session.root) return;
        await refreshTree();
        if (session === activeVault && change && change.watcherUnavailable) {
          setStatus('Automatic file updates stopped. Reopen the vault to resume watching; use Refresh Files meanwhile.', {
            type: 'warning',
            action: 'File watcher stopped',
            detail: 'Reopen the vault to resume automatic updates.'
          });
        }
      });
    }

    function setVaultName(name) {
      setText(vaultName, name || 'Vault');
    }

    async function openRoot(vaultRoot) {
      activeVault = { root: String(vaultRoot || '') };
      refreshButton.disabled = false;
      entriesByFolder.clear();
      navigator.openFolder('');
      await ensureFolderLoaded('');
      if (vaultProfileState && typeof vaultProfileState.load === 'function') await vaultProfileState.load();
      await loadIndexHealth();
      renderTree();
    }

    async function refreshTree() {
      if (treeRefreshInFlight) {
        treeRefreshPending = true;
        return;
      }
      treeRefreshInFlight = true;
      refreshButton.disabled = true;
      try {
        do {
          treeRefreshPending = false;
          entriesByFolder.clear();
          const expandedFolders = Object.keys(navigator.snapshot().expandedFolders).filter((folderPath) => navigator.isExpanded(folderPath));
          await ensureFolderLoaded('');
          for (const folderPath of expandedFolders) {
            await ensureFolderLoaded(folderPath);
          }
          await loadIndexHealth();
          renderTree();
        } while (treeRefreshPending);
      } finally {
        refreshButton.disabled = false;
        treeRefreshInFlight = false;
      }
    }

    async function ensureFolderLoaded(folderPath) {
      const normalized = window.VincariosFileNavigator.normalizePath(folderPath || '');
      if (entriesByFolder.has(normalized) || loadingFolders.has(normalized)) return;
      if (!api || !api.vault) {
        setStatus('Vault API unavailable.');
        return;
      }

      loadingFolders.add(normalized);
      const result = await api.vault.listFolder(normalized);
      loadingFolders.delete(normalized);

      if (!result.ok) {
        entriesByFolder.set(normalized, { ok: false, message: result.message || 'Could not list folder.', entries: [] });
        return;
      }

      entriesByFolder.set(normalized, { ok: true, entries: result.entries || [] });
    }

    function renderTree() {
      treeRenderer.render();
    }

    function attachRefreshIcon() {
      const renderer = getIconRenderer();
      if (!renderer || typeof renderer.createIconElement !== 'function') return;
      refreshButton.textContent = '';
      refreshButton.appendChild(renderer.createIconElement('refresh', 'file-refresh-icon'));
    }

    function setCollapsed(collapsed) {
      if (!collapseButton) return;
      const next = collapsed === true;
      collapseButton.setAttribute('aria-expanded', next ? 'false' : 'true');
      collapseButton.setAttribute('aria-label', next ? 'Expand Files' : 'Collapse Files');
      collapseButton.title = next ? 'Expand Files' : 'Collapse Files';
      const renderer = getIconRenderer();
      collapseButton.textContent = '';
      if (renderer && typeof renderer.createIconElement === 'function') {
        collapseButton.appendChild(renderer.createIconElement(next ? 'chevronRight' : 'chevronLeft', 'file-collapse-icon'));
        return;
      }
      collapseButton.textContent = next ? '>' : '<';
    }

    function createFileRowIcon(entry) {
      const wrapper = document.createElement('span');
      wrapper.className = 'file-row-icon';
      wrapper.classList.toggle('is-folder', entry.kind === 'folder');
      wrapper.classList.toggle('is-file', entry.kind !== 'folder');
      wrapper.classList.toggle('is-expanded', entry.kind === 'folder' && navigator.isExpanded(entry.path));

      const renderer = getIconRenderer();
      if (!renderer || typeof renderer.createIconElement !== 'function') return wrapper;

      if (entry.kind === 'folder') {
        const visual = getFolderVisual(entry.path);
        const colorToken = getVisualColorToken(visual);
        if (visual) wrapper.classList.add('has-folder-visual', 'folder-visual-color');
        if (colorToken) wrapper.setAttribute('data-folder-color', colorToken);
        wrapper.appendChild(renderer.createIconElement(navigator.isExpanded(entry.path) ? 'chevronDown' : 'chevronRight', 'file-row-chevron-icon'));
        wrapper.appendChild(createFolderVisualIcon(renderer, visual));
        return wrapper;
      }

      wrapper.appendChild(renderer.createIconElement(entry.kind === 'image' ? 'image' : (isMarkdownPath(entry.path) ? 'markdownFile' : 'file'), 'file-row-type-icon'));
      return wrapper;
    }
    function handleFileTreeRenameShortcut(event) {
      if (!keyboard || typeof keyboard.isFileTreeRenameShortcut !== 'function' || !keyboard.isFileTreeRenameShortcut(event)) return;
      if (activeRename) return;
      const selectedPath = normalizePath(navigator.snapshot().selectedPath);
      const row = visibleRows.get(selectedPath);
      const entry = visibleEntries.get(selectedPath);
      const label = row && typeof row.querySelector === 'function' ? row.querySelector('.file-row-label') : null;
      if (!row || !entry || !label) return;
      event.preventDefault();
      startInlineRename(entry, row, label);
    }
    function startInlineRename(entry, row, label) {
      if (!entry || entry.kind === 'folder') return;
      if (!isMarkdownPath(entry.path)) {
        setStatus('Rename Light supports Markdown files only.');
        return;
      }
      if (!api || !api.vault || typeof api.vault.renameFile !== 'function') {
        setStatus('Rename service unavailable.');
        return;
      }
      if (activeRename && typeof activeRename.cancel === 'function') activeRename.cancel();

      row.classList.add('is-renaming');
      label.textContent = '';
      const input = document.createElement('input');
      input.className = 'file-rename-input';
      input.type = 'text';
      input.value = entry.name;
      input.setAttribute('aria-label', 'Rename file ' + entry.name);
      label.appendChild(input);

      let finished = false;
      function restore() {
        row.classList.remove('is-renaming');
        label.textContent = entry.name;
        activeRename = null;
        focusTreeRow(row);
      }
      function cancel() {
        if (finished) return;
        finished = true;
        restore();
        setStatus('Rename cancelled.');
      }
      async function commit() {
        if (finished) return;
        finished = true;
        const nextName = input.value.trim();
        row.classList.remove('is-renaming');
        activeRename = null;
        if (!nextName || nextName === entry.name) {
          label.textContent = entry.name;
          focusTreeRow(row);
          return;
        }

        label.textContent = nextName;
        setStatus('Renaming ' + entry.path + '...');
        const result = await api.vault.renameFile({ sourcePath: entry.path, newName: nextName });
        if (!result || !result.ok) {
          label.textContent = entry.name;
          setStatus('Rename failed: ' + ((result && result.message) || 'Could not rename file.'));
          renderTree();
          focusRenderedPath(entry.path);
          return;
        }

        navigator.selectFile(result.targetPath);
        await refreshTree();
        await refreshRenamedPreview(entry.path, result.targetPath);
        focusRenderedPath(result.targetPath);
        setStatus('Renamed: ' + result.targetPath + '. Links were not updated in V1.', {
          type: 'success',
          action: 'Renamed',
          targetPath: result.targetPath,
          detail: 'Links were not updated in V1.'
        });
      }

      activeRename = { cancel };
      input.addEventListener('click', (event) => event.stopPropagation());
      input.addEventListener('keydown', (event) => {
        event.stopPropagation();
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
        }
      });
      input.addEventListener('blur', commit);
      input.focus();
      input.select();
    }

    async function refreshRenamedPreview(oldPath, newPath) {
      if (!previewController || typeof previewController.getCurrentPath !== 'function') return;
      if (window.VincariosFileNavigator.normalizePath(previewController.getCurrentPath()) !== window.VincariosFileNavigator.normalizePath(oldPath)) return;
      const read = await api.vault.readMarkdown(newPath);
      if (!read.ok) return;
      setPreviewSource(read.content, read.path, { recordHistory: false });
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
    }
    async function activateEntry(entry) {
      if (entry.kind === 'folder') {
        navigator.toggleFolder(entry.path);
        if (contextState) contextState.setFolder(entry.path, { readAllowed: canUsePathAsContext(entry.path) });
        else setText(context, 'Selection folder: ' + entry.path + '/');
        if (navigator.isExpanded(entry.path)) {
          setStatus('Listing ' + entry.path + '...');
          await ensureFolderLoaded(entry.path);
          setStatus('Folder listed: ' + entry.path, {
            type: 'info',
            action: 'Listed folder',
            targetPath: entry.path,
            detail: ''
          });
        }
        renderTree();
        focusRenderedPath(entry.path);
        return;
      }

      if (entry.kind === 'image') {
        const navigation = await requestPreviewNavigation(entry.path);
        if (!navigation.ok) return;
        navigator.selectFile(entry.path);
        updateNavigation(navigator.snapshot());
        renderTree();
        focusRenderedPath(entry.path);
        setPreviewImage(entry.path);
        if (contextState) contextState.setFile(entry.path, createFileSelectionDetails(entry.path));
        else setText(context, 'Selection image: ' + entry.path);
        setStatus('Image selected: ' + entry.path);
        return;
      }
      const navigation = await requestPreviewNavigation(entry.path);
      if (!navigation.ok) return;
      setStatus('Reading ' + entry.path + '...');
      const read = await api.vault.readMarkdown(entry.path);
      if (!read.ok) {
        setPreviewMessage(read.message || 'Could not read file.');
        setStatus('Read failed.');
        return;
      }
      navigator.selectFile(read.path);
      updateNavigation(navigator.snapshot());
      renderTree();
      focusRenderedPath(read.path);
      setPreviewSource(read.content, read.path);
      await recordRecentMarkdown(read.path);
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
      else setText(context, 'Selection file: ' + read.path);
      setStatus('Read: ' + read.path, {
        type: 'success',
        action: 'Read file',
        targetPath: read.path,
        detail: ''
      });
    }

    function subscribeToVaultProfileState() {
      if (!vaultProfileState || typeof vaultProfileState.subscribe !== 'function') return;
      vaultProfileState.subscribe(() => renderTree());
    }

    function subscribeToUpdateFlashState() {
      if (!updateFlashState || typeof updateFlashState.subscribe !== 'function') return;
      updateFlashState.subscribe(applyFlashSnapshot);
    }

    function applyFlashSnapshot() {
      visibleRows.forEach((row, path) => {
        row.classList.toggle('is-recently-updated', updateFlashState.isFlashing(path));
      });
    }

    function applyFlashClass(row, path) {
      if (!row || !updateFlashState || typeof updateFlashState.isFlashing !== 'function') return;
      row.classList.toggle('is-recently-updated', updateFlashState.isFlashing(normalizePath(path)));
    }

    function flashPath(path) {
      if (!updateFlashState || typeof updateFlashState.flashTargets !== 'function') return;
      updateFlashState.flashTargets({ path, kind: 'file', reason: 'updated' });
    }

    async function refreshLoadedMarkdown(path) {
      const targetPath = window.VincariosFileNavigator.normalizePath(path || '');
      if (!targetPath || !previewController || typeof previewController.getCurrentPath !== 'function') return { ok: false, message: 'No preview file to refresh.' };
      if (window.VincariosFileNavigator.normalizePath(previewController.getCurrentPath()) !== targetPath) return { ok: true, skipped: true };
      const read = await api.vault.readMarkdown(targetPath);
      if (!read.ok) return read;
      setPreviewSource(read.content, read.path, { recordHistory: false });
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
      setStatus('Preview refreshed: ' + read.path);
      return { ok: true, path: read.path };
    }
    async function handleTreeKeydown(event, row, entry) {
      if (!keyboard || !keyboard.isFileTreeNavigationKey(event.key)) return;

      const rows = Array.from(tree.querySelectorAll('.file-row'));
      if (!rows.length) return;

      const currentIndex = Math.max(0, rows.indexOf(row));
      const pageSize = Math.max(1, Math.floor(tree.clientHeight / Math.max(1, row.offsetHeight || 23)));
      const command = keyboard.getFileTreeNavigation({
        key: event.key,
        rows,
        currentIndex,
        pageSize
      });

      if (!command || command.type === 'none') return;
      event.preventDefault();

      if (command.type === 'focus') {
        focusTreeRow(rows[command.nextIndex]);
        return;
      }

      if (entry.kind !== 'folder') return;

      if (command.type === 'expand') {
        if (!navigator.isExpanded(entry.path)) {
          navigator.expandFolder(entry.path);
          if (contextState) contextState.setFolder(entry.path, { readAllowed: canUsePathAsContext(entry.path) });
          setStatus('Listing ' + entry.path + '...');
          await ensureFolderLoaded(entry.path);
          setStatus('Folder listed: ' + entry.path, {
            type: 'info',
            action: 'Listed folder',
            targetPath: entry.path,
            detail: ''
          });
          renderTree();
          focusRenderedPath(entry.path);
        }
        return;
      }

      if (command.type === 'collapse' && navigator.isExpanded(entry.path)) {
        navigator.collapseFolder(entry.path);
        renderTree();
        focusRenderedPath(entry.path);
      }
    }

    function focusTreeRow(row) {
      if (!row) return;
      row.focus({ preventScroll: true });
      row.scrollIntoView({ block: 'nearest' });
    }

    function focusRenderedPath(path) {
      const rows = Array.from(tree.querySelectorAll('.file-row'));
      focusTreeRow(rows.find((item) => item.dataset.path === path));
    }
    async function openLinkedMarkdown(target, currentPath) {
      const resolver = window.VincariosMarkdownLinkResolver;
      if (!resolver || !resolver.resolveMarkdownLink) {
        return { ok: false, message: 'Markdown link resolver unavailable.' };
      }

      const read = await resolver.resolveMarkdownLink(target, currentPath, api);
      if (!read.ok) return read;
      const navigation = await requestPreviewNavigation(read.path);
      if (!navigation.ok) return navigation;
      navigator.selectFile(read.path);
      setPreviewSource(read.content, read.path);
      await recordRecentMarkdown(read.path);
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
      else setText(context, 'Selection file: ' + read.path);
      setStatus('Opened linked note: ' + read.path);
      return { ok: true, path: read.path };
    }

    async function revealPath(path) {
      if (onRequestExpand) onRequestExpand();
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      if (!normalizedPath) return { ok: false, message: 'No preview file to reveal.' };

      const folders = ancestorFolders(normalizedPath);
      for (const folder of folders) {
        navigator.expandFolder(folder);
        await ensureFolderLoaded(folder);
      }
      navigator.selectFile(normalizedPath);
      renderTree();
      setStatus('Revealed in Files: ' + normalizedPath);
      return { ok: true, path: normalizedPath };
    }
    async function openMarkdownPath(path) {
      const navigation = await requestPreviewNavigation(path);
      if (!navigation.ok) return navigation;
      const revealed = await revealPath(path);
      if (!revealed.ok) return revealed;
      return openMarkdownPreview(revealed.path, { updateSelection: true, skipNavigationGuard: true, statusPrefix: 'Opened in preview: ' });
    }

    async function openVaultEntry(path) {
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      if (!normalizedPath) return { ok: false, message: 'No supported vault item selected.' };
      const kind = isImagePath(normalizedPath) ? 'image' : (isMarkdownPath(normalizedPath) ? 'markdown' : 'file');
      if (kind === 'file') return { ok: false, message: 'This vault item cannot be opened in Preview yet.' };
      const revealed = await revealPath(normalizedPath);
      if (!revealed.ok) return revealed;
      return activateEntry({ path: revealed.path, kind });
    }

    async function openMarkdownPreview(path, behavior) {
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      if (!normalizedPath) return { ok: false, message: 'No Markdown note selected.' };

      const read = await api.vault.readMarkdown(normalizedPath);
      if (!read.ok) {
        setPreviewMessage(read.message || 'Could not read file.');
        setStatus('Read failed.');
        return read;
      }

      if (!behavior || behavior.skipNavigationGuard !== true) {
        const navigation = await requestPreviewNavigation(read.path);
        if (!navigation.ok) return navigation;
      }
      setPreviewSource(read.content, read.path);
      await recordRecentMarkdown(read.path);
      if (!behavior || behavior.updateSelection !== false) {
        navigator.selectFile(read.path);
        if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
        else setText(context, 'Selection file: ' + read.path);
      }
      setStatus((behavior && behavior.statusPrefix || 'Opened in preview: ') + read.path);
      return Object.assign({ ok: true }, read);
    }
    async function revealFolder(path) {
      if (onRequestExpand) onRequestExpand();
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      const folders = ancestorFolders(normalizedPath + '/placeholder.md');
      for (const folder of folders) {
        navigator.expandFolder(folder);
        await ensureFolderLoaded(folder);
      }
      navigator.selectFolder(normalizedPath);
      if (contextState) contextState.setFolder(normalizedPath, { readAllowed: canUsePathAsContext(normalizedPath) });
      renderTree();
      setStatus('Revealed in Files: ' + (normalizedPath || 'Vault root'));
      return { ok: true, path: normalizedPath };
    }

    function ancestorFolders(path) {
      const parent = window.VincariosFileNavigator.parentFolder(path);
      if (!parent) return [''];
      const parts = parent.split('/').filter(Boolean);
      const folders = [''];
      for (let index = 0; index < parts.length; index += 1) {
        folders.push(parts.slice(0, index + 1).join('/'));
      }
      return folders;
    }

    function getFolderVisual(path) {
      if (vaultProfileState && typeof vaultProfileState.getFolderVisual === 'function') return vaultProfileState.getFolderVisual(path);
      return null;
    }

    function createFolderVisualIcon(renderer, visual) {
      const visualRenderer = getVaultProfileVisualIconRenderer();
      if (visualRenderer && typeof visualRenderer.createFolderVisualIcon === 'function') {
        const icon = visualRenderer.createFolderVisualIcon({
          renderer,
          visual,
          className: 'file-row-type-icon',
          resolveBuiltinIconName: (iconId) => resolveFolderVisualIconName({ icon: { kind: 'builtin', id: iconId } })
        });
        if (icon) return icon;
      }
      return renderer.createIconElement(resolveFolderVisualIconName(visual), 'file-row-type-icon');
    }

    function getVaultProfileVisualIconRenderer() {
      return typeof window !== 'undefined' ? window.VincariosVaultProfileVisualIconRenderer : null;
    }

    function resolveFolderVisualIconName(visual) {
      const registry = typeof window !== 'undefined' ? window.VincariosIconRegistry : null;
      const helpers = getFolderVisualHelpers();
      if (!visual || !registry || typeof registry.resolveFolderVisualIconName !== 'function') return 'folder';
      const iconId = helpers && typeof helpers.getVisualIconId === 'function' ? helpers.getVisualIconId(visual) : 'folder';
      return registry.resolveFolderVisualIconName(iconId);
    }

    function getVisualColorToken(visual) {
      const helpers = getFolderVisualHelpers();
      return helpers && typeof helpers.getVisualColorToken === 'function' ? helpers.getVisualColorToken(visual) : '';
    }


    function getFolderVisualHelpers() {
      return typeof window !== 'undefined' ? window.VincariosFolderVisuals : null;
    }

    function getIconRenderer() {
      return (typeof window !== 'undefined' && window.VincariosIconRenderer) ? window.VincariosIconRenderer : null;
    }

    function getFileTreeRenderer() {
      if (typeof window !== 'undefined' && window.VincariosFileTreeRenderer) {
        return window.VincariosFileTreeRenderer;
      }
      if (typeof require === 'function') return require('./fileTreeRenderer');
      return null;
    }

    function isMarkdownPath(path) {
      return /\.m(?:d|arkdown)$/i.test(String(path || ''));
    }

    function isImagePath(path) {
      return /\.(?:png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(String(path || ''));
    }
    function createFileSelectionDetails(path) {
      return {
        content: '',
        readAllowed: canUsePathAsContext(path),
        writeAllowed: canUsePathAsUpdateTarget(path),
        parentReadAllowed: canUsePathAsContext(window.VincariosFileNavigator.parentFolder(path) || '')
      };
    }
    function createContextDetails(path, content) {
      const parentFolder = window.VincariosFileNavigator.parentFolder(path);
      return {
        content,
        readAllowed: canUsePathAsContext(path),
        writeAllowed: canUsePathAsUpdateTarget(path),
        parentReadAllowed: parentFolder ? canUsePathAsContext(parentFolder) : canUsePathAsContext('')
      };
    }

    function syncSelectedContextPermission() {
      if (!contextState || typeof contextState.snapshot !== 'function') return;
      const selected = contextState.snapshot();
      if (!selected.path) return;
      if (selected.kind === 'folder') {
        contextState.setFolder(selected.path, { readAllowed: canUsePathAsContext(selected.path) });
        return;
      }
      if (selected.kind === 'file') contextState.setFile(selected.path, createContextDetails(selected.path, selected.content));
    }

    function canUsePathAsContext(path) {
      if (!permissionState || typeof permissionState.resolve !== 'function') return false;
      return permissionState.resolve(path).read === true;
    }

    function canUsePathAsUpdateTarget(path) {
      if (!permissionState || typeof permissionState.resolve !== 'function') return false;
      return permissionState.resolve(path).write === true;
    }

    function permissionCandidates(path) {
      const normalized = window.VincariosFileNavigator.normalizePath(path || '');
      if (!normalized) return [''];
      const parts = normalized.split('/').filter(Boolean);
      const candidates = [normalized];
      for (let count = parts.length - 1; count > 0; count -= 1) {
        candidates.push(parts.slice(0, count).join('/'));
      }
      candidates.push('');
      return candidates;
    }

    function formatRowAriaLabel(entry) {
      const type = entry && entry.kind === 'folder' ? 'Folder' : 'File';
      const name = (entry && (entry.name || entry.path)) || 'Untitled';
      return type + ': ' + name;
    }
    function createPermissionControls(path) {
      const controls = document.createElement('span');
      controls.className = 'file-permission-controls';

      const readButton = createPermissionButton('R', 'Toggle read permission', path, (event) => togglePermission(path, 'read', event));
      const writeButton = createPermissionButton('W', 'Toggle write permission', path, (event) => togglePermission(path, 'write', event));

      controls.appendChild(readButton);
      controls.appendChild(writeButton);
      updatePermissionButtons(path, readButton, writeButton);
      return controls;
    }

    function handlePermissionHotkey(event, entry) {
      if (!permissionState || !event || !entry) return false;
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      if (isInteractiveTarget(event.target)) return false;
      const row = event.target && event.target.closest ? event.target.closest('.file-row') : null;
      if (!row || row.dataset.path !== entry.path) return false;

      const key = event.key.toLowerCase();
      if (key !== 'r' && key !== 'w') return false;
      event.preventDefault();
      event.stopPropagation();

      if (key === 'r') togglePermission(entry.path, 'read').then(() => finishPermissionHotkey(entry.path));
      else togglePermission(entry.path, 'write').then(() => finishPermissionHotkey(entry.path));
      return true;
    }

    function finishPermissionHotkey(path) {
      syncSelectedContextPermission();
      renderTree();
      focusRenderedPath(path);
    }

    function isInteractiveTarget(target) {
      return !!(target && target.closest && target.closest('button,input,textarea,select,[contenteditable="true"]'));
    }

    async function togglePermission(path, flag, event) {
      if (!permissionState) return null;
      const current = permissionState.resolve(path);
      const next = flag === 'read' ? !current.read : !current.write;
      if (event && event.shiftKey) return setPermissionRecursively(path, flag, next);
      if (event && event.ctrlKey) {
        if (flag === 'read') return permissionState.setReadForPaths(knownVisibleDescendantPaths(path), next);
        return permissionState.setWriteForPaths(knownVisibleDescendantPaths(path), next);
      }
      if (flag === 'read') return permissionState.toggleRead(path);
      return permissionState.toggleWrite(path);
    }

    async function setPermissionRecursively(path, flag, enabled) {
      const paths = await recursiveDescendantPaths(path);
      if (flag === 'read') permissionState.setReadForPaths(paths, enabled);
      else permissionState.setWriteForPaths(paths, enabled);

      setStatus(
        (enabled ? 'Enabled ' : 'Disabled ') +
        flag +
        ' permission for ' +
        paths.length +
        ' entr' +
        (paths.length === 1 ? 'y.' : 'ies.')
      );
      return paths;
    }

    async function recursiveDescendantPaths(path) {
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      const collector = window.VincariosPermissionPathCollector;
      if (!collector || !collector.collectRecursivePermissionPaths) return knownVisibleDescendantPaths(normalizedPath);

      return collector.collectRecursivePermissionPaths(normalizedPath, async (folderPath) => {
        await ensureFolderLoaded(folderPath);
        const folderData = entriesByFolder.get(window.VincariosFileNavigator.normalizePath(folderPath || ''));
        if (!folderData || !folderData.ok) return { ok: false, entries: [] };
        return { ok: true, entries: folderData.entries || [] };
      });
    }

    function knownVisibleDescendantPaths(path) {
      const normalizedPath = window.VincariosFileNavigator.normalizePath(path || '');
      const paths = new Set([normalizedPath]);
      collectVisibleDescendants(normalizedPath, paths);
      return Array.from(paths);
    }

    function collectVisibleDescendants(folderPath, paths) {
      const folderData = entriesByFolder.get(folderPath);
      if (!folderData || !folderData.ok) return;

      folderData.entries.forEach((entry) => {
        paths.add(entry.path);
        if (entry.kind === 'folder' && navigator.isExpanded(entry.path)) collectVisibleDescendants(entry.path, paths);
      });
    }

    function createPermissionButton(label, title, path, toggle) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'file-permission-button';
      button.textContent = label;
      button.title = title;
      button.setAttribute('aria-label', title + ': ' + path);
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        try {
          await toggle(event);
        } finally {
          button.disabled = false;
          syncSelectedContextPermission();
          renderTree();
        }
      });
      return button;
    }
    function updatePermissionButtons(path, readButton, writeButton) {
      const permissions = permissionState
        ? permissionState.resolve(path)
        : { read: false, write: false, readState: 'off', writeState: 'off' };
      updatePermissionButtonState(readButton, permissions.read, permissions.readState);
      updatePermissionButtonState(writeButton, permissions.write, permissions.writeState);
    }

    function updatePermissionButtonState(button, enabled, state) {
      button.classList.toggle('is-active', enabled === true && state === 'direct');
      button.classList.toggle('is-inherited', enabled === true && state === 'inherited');
      button.setAttribute('aria-pressed', String(enabled === true));
      button.dataset.permissionState = state || 'off';
    }
    function updateNavigation(state) {
      const parts = state.breadcrumb.length
        ? state.breadcrumb.map((part) => part.label).join(' / ')
        : 'Vault root';
      breadcrumb.textContent = state.selectedKind === 'markdown'
        ? parts + ' / ' + state.selectedPath.split('/').pop()
        : parts;
    }

    function normalizePath(value) {
      return window.VincariosFileNavigator.normalizePath(value || '');
    }

    async function requestPreviewNavigation(path) {
      if (!previewController || typeof previewController.requestNavigation !== 'function') return { ok: true };
      return previewController.requestNavigation(path);
    }
    function setPreviewSource(content, path, behavior) {
      if (previewController && previewController.setSource) previewController.setSource(content, path, behavior);
    }

    function setPreviewMessage(message) {
      if (previewController && previewController.setMessage) previewController.setMessage(message);
    }

    function setPreviewImage(path) {
      if (previewController && typeof previewController.setImageAsset === 'function') {
        previewController.setImageAsset(path);
        return;
      }
      setPreviewMessage('Image file selected. Image preview unavailable.');
    }

    async function recordRecentMarkdown(path) {
      if (!api || !api.vault || typeof api.vault.recordRecentFile !== 'function') return null;
      try {
        const result = await Promise.resolve(api.vault.recordRecentFile({ path }));
        if (result && result.ok !== false && onRecentFileRecorded) await Promise.resolve(onRecentFileRecorded(path, result));
        return result;
      } catch (_error) {
        return null;
      }
    }

    function setStatus(value, activity) {
      if (activityReporter && typeof activityReporter.report === 'function') {
        activityReporter.report({ message: value, activity });
        return;
      }
      setText(status, value);
    }

    return {
      openRoot,
      refreshTree,
      refreshLoadedMarkdown,
      setCollapsed,
      flashPath,
      renderTree,
      ensureFolderLoaded,
      setVaultName,
      openLinkedMarkdown,
      openMarkdownPath,
      openMarkdownPreview,
      openVaultEntry,
      revealPath,
      revealFolder,
      navigator
    };
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  const api = { mountFilePanel };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFilePanel = Object.freeze(api);
})();
