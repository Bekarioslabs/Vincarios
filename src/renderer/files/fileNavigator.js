(function() {
  'use strict';

  function createFileNavigator(initialState) {
    const state = Object.assign({
      currentFolder: '',
      selectedPath: '',
      selectedKind: '',
      history: []
    }, initialState || {});

    function openFolder(folderPath) {
      const next = normalizeFolder(folderPath);
      if (next !== state.currentFolder) {
        state.history.push(state.currentFolder);
        state.currentFolder = next;
      }
      state.selectedPath = next;
      state.selectedKind = 'folder';
      return snapshot();
    }

    function selectFile(filePath) {
      state.selectedPath = normalizePath(filePath);
      state.selectedKind = 'markdown';
      return snapshot();
    }

    function goBack() {
      if (!state.history.length) return snapshot();
      state.currentFolder = state.history.pop();
      state.selectedPath = state.currentFolder;
      state.selectedKind = 'folder';
      return snapshot();
    }

    function canGoBack() {
      return state.history.length > 0;
    }

    function breadcrumb() {
      if (!state.currentFolder) return [];
      const parts = state.currentFolder.split('/').filter(Boolean);
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
        canGoBack: canGoBack(),
        breadcrumb: breadcrumb()
      };
    }

    return {
      openFolder,
      selectFile,
      goBack,
      canGoBack,
      breadcrumb,
      snapshot
    };
  }

  function normalizeFolder(value) {
    return normalizePath(value).replace(/\/+$/g, '');
  }

  function normalizePath(value) {
    return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  }

  const api = {
    createFileNavigator,
    normalizePath
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusFileNavigator = Object.freeze(api);
})();