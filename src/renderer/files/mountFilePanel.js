(function() {
  'use strict';

  function mountFilePanel(options) {
    options = options || {};
    const api = options.api;
    const root = options.root;
    const previewController = options.previewController || null;
    const status = options.status;
    const context = options.context;
    const contextState = options.contextState || null;
    const permissionState = options.permissionState || null;
    const updateFlashState = options.updateFlashState || null;
    const vaultProfileState = options.vaultProfileState || null;
    const onToggleCollapse = typeof options.onToggleCollapse === 'function' ? options.onToggleCollapse : null;
    const onRequestExpand = typeof options.onRequestExpand === 'function' ? options.onRequestExpand : null;
    const navigator = options.navigator || window.VitruviosFileNavigator.createFileNavigator();
    const keyboard = options.keyboard || window.VitruviosFileTreeKeyboard || null;
    const entriesByFolder = new Map();
    const loadingFolders = new Set();
    const visibleRows = new Map();
    let activeRename = null;

    if (!root) return null;

    root.innerHTML = [
      '<div class="file-toolbar ui-panel-header">',
      '  <div class="file-title-wrap">',
      '    <div class="file-label ui-panel-header-label">Files</div>',
      '    <div id="file-vault-name" class="file-vault-name">No vault</div>',
      '  </div>',
      '  <button id="file-refresh" class="file-refresh-button ui-tool-button" type="button" disabled title="Refresh file tree" aria-label="Refresh file tree"></button>',
      '  <button id="file-collapse" class="file-collapse-button ui-tool-button" type="button" data-files-collapse-toggle aria-label="Collapse Files" title="Collapse Files" aria-expanded="true" aria-controls="file-tree"></button>',
      '</div>',
      '<div id="file-breadcrumb" class="file-breadcrumb">Vault root</div>',
      '<div id="file-tree" class="file-tree muted">Open a vault to list files.</div>'
    ].join('');

    const refreshButton = root.querySelector('#file-refresh');
    const collapseButton = root.querySelector('#file-collapse');
    const breadcrumb = root.querySelector('#file-breadcrumb');
    const tree = root.querySelector('#file-tree');
    const vaultName = root.querySelector('#file-vault-name');

    attachRefreshIcon();
    setCollapsed(false);
    refreshButton.addEventListener('click', refreshTree);
    if (collapseButton) {
      collapseButton.addEventListener('click', () => {
        if (onToggleCollapse) onToggleCollapse();
      });
    }
    subscribeToUpdateFlashState();
    subscribeToVaultProfileState();

    function setVaultName(name) {
      setText(vaultName, name || 'Vault');
    }

    async function openRoot() {
      refreshButton.disabled = false;
      entriesByFolder.clear();
      navigator.openFolder('');
      await ensureFolderLoaded('');
      if (vaultProfileState && typeof vaultProfileState.load === 'function') await vaultProfileState.load();
      renderTree();
    }

    async function refreshTree() {
      refreshButton.disabled = true;
      entriesByFolder.clear();
      const expandedFolders = Object.keys(navigator.snapshot().expandedFolders).filter((folderPath) => navigator.isExpanded(folderPath));
      await ensureFolderLoaded('');
      for (const folderPath of expandedFolders) {
        await ensureFolderLoaded(folderPath);
      }
      refreshButton.disabled = false;
      renderTree();
    }

    async function ensureFolderLoaded(folderPath) {
      const normalized = window.VitruviosFileNavigator.normalizePath(folderPath || '');
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
      const state = navigator.snapshot();
      updateNavigation(state);
      tree.innerHTML = '';
      visibleRows.clear();
      tree.className = 'file-tree';

      const rootData = entriesByFolder.get('');
      if (!rootData) {
        tree.className = 'file-tree muted';
        tree.textContent = 'Open a vault to list files.';
        return;
      }

      if (!rootData.ok) {
        tree.className = 'file-tree error';
        tree.textContent = rootData.message;
        return;
      }

      if (!rootData.entries.length) {
        tree.className = 'file-tree muted';
        tree.textContent = 'No Markdown files or visible folders here.';
        return;
      }

      renderEntries(rootData.entries, 0, tree);
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
    function renderEntries(entries, depth, parentNode) {
      entries.forEach((entry) => {
        const row = document.createElement('div');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', formatRowAriaLabel(entry));
        row.tabIndex = 0;
        row.className = 'file-row file-row-' + entry.kind;
        row.dataset.path = entry.path;
        row.style.setProperty('--tree-depth', String(depth));
        visibleRows.set(normalizePath(entry.path), row);

        const icon = createFileRowIcon(entry);

        const label = document.createElement('span');
        label.className = 'file-row-label';
        label.textContent = entry.name;

        row.appendChild(createPermissionControls(entry.path));
        row.appendChild(icon);
        row.appendChild(label);
        applyFlashClass(row, entry.path);


        const selected = navigator.snapshot().selectedPath === entry.path;
        if (selected) {
          row.classList.add('is-selected');
          row.setAttribute('aria-current', 'true');
        }

        row.addEventListener('click', () => {
          focusTreeRow(row);
          activateEntry(entry);
        });
        row.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            focusTreeRow(row);
            activateEntry(entry);
            return;
          }
          if (event.key === 'F2') {
            event.preventDefault();
            startInlineRename(entry, row, label);
            return;
          }
          if (handlePermissionHotkey(event, entry)) return;
          handleTreeKeydown(event, row, entry);
        });

        parentNode.appendChild(row);

        if (entry.kind === 'folder' && navigator.isExpanded(entry.path)) {
          const childData = entriesByFolder.get(entry.path);
          if (childData && childData.ok) {
            renderEntries(childData.entries, depth + 1, parentNode);
          } else if (childData && !childData.ok) {
            const error = document.createElement('div');
            error.className = 'file-tree-inline-error';
            error.style.setProperty('--tree-depth', String(depth + 1));
            error.textContent = childData.message;
            parentNode.appendChild(error);
          } else if (loadingFolders.has(entry.path)) {
            const loading = document.createElement('div');
            loading.className = 'file-tree-inline-muted';
            loading.style.setProperty('--tree-depth', String(depth + 1));
            loading.textContent = 'Loading...';
            parentNode.appendChild(loading);
          }
        }
      });
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
        setStatus('Renamed: ' + result.targetPath + '. Links were not updated in V1.');
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
      if (window.VitruviosFileNavigator.normalizePath(previewController.getCurrentPath()) !== window.VitruviosFileNavigator.normalizePath(oldPath)) return;
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
          setStatus('Folder listed: ' + entry.path);
        }
        renderTree();
        focusRenderedPath(entry.path);
        return;
      }

      navigator.selectFile(entry.path);
      updateNavigation(navigator.snapshot());
      renderTree();
      focusRenderedPath(entry.path);
      if (entry.kind === 'image') {
        setPreviewImage(entry.path);
        if (contextState) contextState.setFile(entry.path, createFileSelectionDetails(entry.path));
        else setText(context, 'Selection image: ' + entry.path);
        setStatus('Image selected: ' + entry.path);
        return;
      }
      setStatus('Reading ' + entry.path + '...');
      const read = await api.vault.readMarkdown(entry.path);
      if (!read.ok) {
        setPreviewMessage(read.message || 'Could not read file.');
        setStatus('Read failed.');
        return;
      }
      setPreviewSource(read.content, read.path);
      if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
      else setText(context, 'Selection file: ' + read.path);
      setStatus('Read: ' + read.path);
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
      const targetPath = window.VitruviosFileNavigator.normalizePath(path || '');
      if (!targetPath || !previewController || typeof previewController.getCurrentPath !== 'function') return { ok: false, message: 'No preview file to refresh.' };
      if (window.VitruviosFileNavigator.normalizePath(previewController.getCurrentPath()) !== targetPath) return { ok: true, skipped: true };
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
          setStatus('Folder listed: ' + entry.path);
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
      const resolver = window.VitruviosMarkdownLinkResolver;
      if (!resolver || !resolver.createMarkdownLinkCandidates) {
        return { ok: false, message: 'Markdown link resolver unavailable.' };
      }

      const candidates = resolver.createMarkdownLinkCandidates(target, currentPath);
      if (!candidates.length) return { ok: false, message: 'Linked target is not an internal Markdown note.' };

      for (const candidate of candidates) {
        const read = await api.vault.readMarkdown(candidate);
        if (read.ok) {
          navigator.selectFile(read.path);
          setPreviewSource(read.content, read.path);
          if (contextState) contextState.setFile(read.path, createContextDetails(read.path, read.content));
          else setText(context, 'Selection file: ' + read.path);
          setStatus('Opened linked note: ' + read.path);
          return { ok: true, path: read.path };
        }
      }

      return { ok: false, message: 'Linked note not found: ' + target };
    }

    async function revealPath(path) {
      if (onRequestExpand) onRequestExpand();
      const normalizedPath = window.VitruviosFileNavigator.normalizePath(path || '');
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
    async function revealFolder(path) {
      if (onRequestExpand) onRequestExpand();
      const normalizedPath = window.VitruviosFileNavigator.normalizePath(path || '');
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
      const parent = window.VitruviosFileNavigator.parentFolder(path);
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
      return typeof window !== 'undefined' ? window.VitruviosVaultProfileVisualIconRenderer : null;
    }

    function resolveFolderVisualIconName(visual) {
      const registry = typeof window !== 'undefined' ? window.VitruviosIconRegistry : null;
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
      return typeof window !== 'undefined' ? window.VitruviosFolderVisuals : null;
    }

    function getIconRenderer() {
      return (typeof window !== 'undefined' && window.VitruviosIconRenderer) ? window.VitruviosIconRenderer : null;
    }

    function isMarkdownPath(path) {
      return /\.m(?:d|arkdown)$/i.test(String(path || ''));
    }
    function createFileSelectionDetails(path) {
      return {
        content: '',
        readAllowed: canUsePathAsContext(path),
        writeAllowed: canUsePathAsUpdateTarget(path),
        parentReadAllowed: canUsePathAsContext(window.VitruviosFileNavigator.parentFolder(path) || '')
      };
    }
    function createContextDetails(path, content) {
      const parentFolder = window.VitruviosFileNavigator.parentFolder(path);
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
      const normalized = window.VitruviosFileNavigator.normalizePath(path || '');
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
      const normalizedPath = window.VitruviosFileNavigator.normalizePath(path || '');
      const collector = window.VitruviosPermissionPathCollector;
      if (!collector || !collector.collectRecursivePermissionPaths) return knownVisibleDescendantPaths(normalizedPath);

      return collector.collectRecursivePermissionPaths(normalizedPath, async (folderPath) => {
        await ensureFolderLoaded(folderPath);
        const folderData = entriesByFolder.get(window.VitruviosFileNavigator.normalizePath(folderPath || ''));
        if (!folderData || !folderData.ok) return { ok: false, entries: [] };
        return { ok: true, entries: folderData.entries || [] };
      });
    }

    function knownVisibleDescendantPaths(path) {
      const normalizedPath = window.VitruviosFileNavigator.normalizePath(path || '');
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
      return window.VitruviosFileNavigator.normalizePath(value || '');
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

    function setStatus(value) {
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
  if (typeof window !== 'undefined') window.VitruviosFilePanel = Object.freeze(api);
})();
