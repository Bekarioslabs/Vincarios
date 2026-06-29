(function() {
  'use strict';

  function hasRecursiveFolderWorkSignal(text) {
    const value = normalizePromptText(text);
    return /\b(alle|all|recursive|recursively|rekursiv|unterordner|subfolder|subfolders|children|descendants)\b/.test(value);
  }

  function hasBlockedActionRetrySignal(text) {
    const value = normalizePromptText(text);
    return /\b(versuch es nochmal|versuch nochmal|try again|try now|nochmal|erneut|retry|freigegeben|freigeschaltet|ist jetzt freigegeben|ist jetzt an|r ist an|read ist an)\b/.test(value);
  }

  function hasSelectionActionGuidanceSignal(text) {
    const value = normalizePromptText(text);
    return /\b(ordner|folder|verzeichnis|directory|hier|here|drin|inside|inhalt|contents?|datei(en)?|files?)\b/.test(value)
      && /\b(was|what|whats|what's|liegt|list|liste|listen|auflisten|zeige|show|check|schau)\b/.test(value);
  }

  function normalizePromptText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const api = {
    hasRecursiveFolderWorkSignal,
    hasBlockedActionRetrySignal,
    hasSelectionActionGuidanceSignal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextIntent = Object.freeze(api);
})();
