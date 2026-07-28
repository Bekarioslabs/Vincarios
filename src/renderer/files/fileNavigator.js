(function() {
  'use strict';

  function createFileNavigator(initialState) {
    const state = Object.assign({
      currentFolder: '',
      selectedPath: '',
      selectedKind: '',
      history: [],
      expandedFolders: { '': true }
    }, initialState || {});

    state.expandedFolders = Object.assign({ '': true }, state.expandedFolders || {});

    function openFolder(folderPath) {
      const next = normalizeFolder(folderPath);
      if (next !== state.currentFolder) {
        state.history.push(state.currentFolder);
        state.currentFolder = next;
      }
      state.selectedPath = next;
      state.selectedKind = 'folder';
      state.expandedFolders[next] = true;
      return snapshot();
    }

    function selectFolder(folderPath) {
      state.selectedPath = normalizeFolder(folderPath);
      state.selectedKind = 'folder';
      return snapshot();
    }

    function selectFile(filePath) {
      state.selectedPath = normalizePath(filePath);
      state.selectedKind = 'markdown';
      return snapshot();
    }

    function toggleFolder(folderPath) {
      const next = normalizeFolder(folderPath);
      state.selectedPath = next;
      state.selectedKind = 'folder';
      state.expandedFolders[next] = !isExpanded(next);
      return snapshot();
    }

    function expandFolder(folderPath) {
      const next = normalizeFolder(folderPath);
      state.expandedFolders[next] = true;
      return snapshot();
    }

    function collapseFolder(folderPath) {
      const next = normalizeFolder(folderPath);
      if (next !== '') state.expandedFolders[next] = false;
      return snapshot();
    }

    function isExpanded(folderPath) {
      return !!state.expandedFolders[normalizeFolder(folderPath)];
    }

    function goBack() {
      if (!state.history.length) return snapshot();
      state.currentFolder = state.history.pop();
      state.selectedPath = state.currentFolder;
      state.selectedKind = 'folder';
      state.expandedFolders[state.currentFolder] = true;
      return snapshot();
    }

    function canGoBack() {
      return state.history.length > 0;
    }

    function breadcrumb() {
      const path = state.selectedKind === 'folder' ? state.selectedPath : parentFolder(state.selectedPath);
      if (!path) return [];
      const parts = path.split('/').filter(Boolean);
      return parts.map((part, index) => ({
        label: part,
        path: parts.slice(0, index + 1).join('/')
      }));
    }

    function snapshot() {
      return {
        currentFolder: state.currentFolder,
        selectedPath: state.selectedPath,
        selectedKind: state.selectedKind,
        expandedFolders: Object.assign({}, state.expandedFolders),
        canGoBack: canGoBack(),
        breadcrumb: breadcrumb()
      };
    }

    return {
      openFolder,
      selectFolder,
      selectFile,
      toggleFolder,
      expandFolder,
      collapseFolder,
      isExpanded,
      goBack,
      canGoBack,
      breadcrumb,
      snapshot
    };
  }

  function parentFolder(value) {
    const path = normalizePath(value);
    const index = path.lastIndexOf('/');
    return index === -1 ? '' : path.slice(0, index);
  }

  function normalizeFolder(value) {
    return normalizePath(value).replace(/\/+$/g, '');
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  const api = {
    createFileNavigator,
    normalizePath,
    parentFolder
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosFileNavigator = Object.freeze(api);
})();
