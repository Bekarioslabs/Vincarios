(function() {
  'use strict';

  function createFileTreeRenderer(options) {
    options = options || {};
    const tree = requireOption(options, 'tree');
    const navigator = requireOption(options, 'navigator');
    const entriesByFolder = requireOption(options, 'entriesByFolder');
    const loadingFolders = requireOption(options, 'loadingFolders');
    const visibleRows = requireOption(options, 'visibleRows');
    const visibleEntries = requireOption(options, 'visibleEntries');
    const keyboard = options.keyboard || null;

    function render() {
      const state = navigator.snapshot();
      options.updateNavigation(state);
      tree.innerHTML = '';
      visibleRows.clear();
      visibleEntries.clear();
      tree.className = 'file-tree';

      const rootData = entriesByFolder.get('');
      if (!rootData) return renderMessage('muted', 'Open a vault to list files.');
      if (!rootData.ok) return renderMessage('error', rootData.message);
      if (!rootData.entries.length) {
        return renderMessage('muted', 'No Markdown files or visible folders here.');
      }
      renderEntries(rootData.entries, 0, tree);
    }

    function renderEntries(entries, depth, parentNode) {
      entries.forEach((entry) => {
        const row = document.createElement('div');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', options.formatRowAriaLabel(entry));
        row.tabIndex = 0;
        row.className = 'file-row file-row-' + entry.kind;
        row.dataset.path = entry.path;
        row.style.setProperty('--tree-depth', String(depth));
        visibleRows.set(options.normalizePath(entry.path), row);
        visibleEntries.set(options.normalizePath(entry.path), entry);

        const label = document.createElement('span');
        label.className = 'file-row-label';
        label.textContent = entry.name;
        row.appendChild(options.createPermissionControls(entry.path));
        row.appendChild(options.createEntryIcon(entry));
        row.appendChild(label);
        options.applyFlashClass(row, entry.path);

        if (navigator.snapshot().selectedPath === entry.path) {
          row.classList.add('is-selected');
          row.setAttribute('aria-current', 'true');
        }

        row.addEventListener('click', async () => {
          options.focusTreeRow(row);
          await options.activateEntry(entry);
        });
        row.addEventListener('keydown', async (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            options.focusTreeRow(row);
            await options.activateEntry(entry);
            return;
          }
          if (keyboard && typeof keyboard.isFileTreeRenameShortcut === 'function'
            && keyboard.isFileTreeRenameShortcut(event)) {
            event.preventDefault();
            options.startInlineRename(entry, row, label);
            return;
          }
          if (options.handlePermissionHotkey(event, entry)) return;
          options.handleTreeKeydown(event, row, entry);
        });
        parentNode.appendChild(row);
        renderExpandedChildren(entry, depth, parentNode);
      });
    }

    function renderExpandedChildren(entry, depth, parentNode) {
      if (entry.kind !== 'folder' || !navigator.isExpanded(entry.path)) return;
      const childData = entriesByFolder.get(entry.path);
      if (childData && childData.ok) {
        renderEntries(childData.entries, depth + 1, parentNode);
        return;
      }
      if (childData && !childData.ok) {
        appendInlineMessage(parentNode, 'file-tree-inline-error', depth + 1, childData.message);
        return;
      }
      if (loadingFolders.has(entry.path)) {
        appendInlineMessage(parentNode, 'file-tree-inline-muted', depth + 1, 'Loading...');
      }
    }

    function renderMessage(tone, message) {
      tree.className = 'file-tree ' + tone;
      tree.textContent = message || '';
    }

    function appendInlineMessage(parentNode, className, depth, message) {
      const node = document.createElement('div');
      node.className = className;
      node.style.setProperty('--tree-depth', String(depth));
      node.textContent = message || '';
      parentNode.appendChild(node);
    }

    return Object.freeze({ render });
  }

  function requireOption(options, key) {
    if (!options[key]) throw new TypeError('File tree renderer requires ' + key + '.');
    return options[key];
  }

  const api = { createFileTreeRenderer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFileTreeRenderer = Object.freeze(api);
})();
