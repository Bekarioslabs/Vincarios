(function() {
  'use strict';

  function looksLikeSelectedTargetRequest(text) {
    const value = normalizePromptText(text);
    const patterns = [
      /\b(diese|dieser|dieses|ausgewaehlte|ausgewahlte|aktuelle|current|selected)\b.*\b(datei|file|note|notiz|ordner|folder|bild|image)\b/,
      /\b(datei|file|note|notiz|ordner|folder|bild|image)\b.*\b(diese|dieser|dieses|ausgewaehlte|ausgewahlte|aktuelle|current|selected)\b/,
      /\b(check|schau|pruef|pruf|analysier|analyse|fasse|summarize|bearbeite|edit|ergaenze|erganze|fuege|fuge|update|verlinke)\b.*\b(datei|file|note|notiz|ordner|folder|bild|image|hier|this|it)\b/,
      /\b(versuch es jetzt|und jetzt|jetzt nochmal|nochmal|try now|again)\b/,
      /\b(hab(e)? es aktiviert|ist aktiviert|r ist an|read ist an|freigegeben|freigeschaltet)\b/,
      /\b(sie|datei|notiz|note|file)\b.*\b(selektiert|ausgewaehlt|ausgewahlt|selected)\b/,
      /\b(darauf|drauf)\b.*\b(zugreifen|zugriff|access)\b/,
      /\bwas steht\b.*\b(datei|notiz|note)\b/,
      /\bwhat is in\b.*\b(file|note)\b/
    ];
    return patterns.some((pattern) => pattern.test(value));
  }

  function looksLikeFolderScopedRequest(text) {
    const value = normalizePromptText(text);
    return mentionsFolder(value) && hasFolderWorkSignal(value);
  }

  function hasFolderWorkSignal(text) {
    const value = normalizePromptText(text);
    return (mentionsFileCollection(value) && (asksForSimilarity(value) || asksToFindOrList(value) || asksToInspect(value))) || (mentionsFolder(value) && asksToInspect(value)) || asksForFolderContents(value) || asksForHereContents(value) || asksForRecursiveFolderListing(value);
  }

  function hasRecursiveFolderWorkSignal(text) {
    return asksForRecursiveFolderListing(normalizePromptText(text));
  }

  function mentionsFolder(value) {
    return hasTargetWord(value, ['ordner', 'folder', 'verzeichnis', 'directory']);
  }

  function mentionsFileCollection(value) {
    return /\b(datei(en)?|files?|notes?|notiz(en)?)\b/.test(value);
  }

  function asksForFolderContents(value) {
    return mentionsFolder(value) && /\b(was|what|whats|what's|liegt|drin|inhalt|inhalte|contents?|inside)\b/.test(value);
  }

  function asksForHereContents(value) {
    return /\b(hier|here|this)\b/.test(value) && /\b(was|what|whats|what's|liegt|drin|inhalt|inhalte|contents?|inside)\b/.test(value);
  }

  function asksForRecursiveFolderListing(value) {
    return /\b(alle|all|recursive|recursively|rekursiv|unterordner|subfolder|subfolders|children|descendants)\b/.test(value);
  }

  function hasTargetWord(value, targets) {
    const tokens = tokenize(value);
    return tokens.some((token) => targets.some((target) => tokenMatchesTargetWord(token, target)));
  }

  function tokenMatchesTargetWord(token, target) {
    if (token === target) return true;
    return hasSingleAdjacentTransposition(token, target);
  }

  function hasSingleAdjacentTransposition(token, target) {
    if (!token || token.length !== target.length || token.length < 5) return false;
    const differences = [];
    for (let index = 0; index < token.length; index += 1) {
      if (token[index] !== target[index]) differences.push(index);
      if (differences.length > 2) return false;
    }
    return differences.length === 2
      && differences[1] === differences[0] + 1
      && token[differences[0]] === target[differences[1]]
      && token[differences[1]] === target[differences[0]];
  }

  function tokenize(value) {
    return String(value || '').match(/[a-z0-9]+/g) || [];
  }

  function hasBlockedActionRetrySignal(text) {
    const value = normalizePromptText(text);
    return /\b(versuch es nochmal|versuch nochmal|try again|try now|nochmal|erneut|retry|freigegeben|freigeschaltet|ist jetzt freigegeben|ist jetzt an|r ist an|read ist an)\b/.test(value);
  }

  function asksForSimilarity(value) {
    return /\b(aehnlich|aehnliche|ahnlich|ahnliche|similar|vergleichbar|related)\b/.test(value);
  }

  function asksToFindOrList(value) {
    return /\b(find|finde|finden|suche|suchen|search|liste|listen|auflisten|zeige|zeig)\b/.test(value);
  }

  function asksToInspect(value) {
    return /\b(check|schau|pruef|pruf|inspect|scan)\b/.test(value);
  }

  function normalizePromptText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const api = {
    looksLikeSelectedTargetRequest,
    looksLikeFolderScopedRequest,
    hasFolderWorkSignal,
    hasRecursiveFolderWorkSignal,
    hasBlockedActionRetrySignal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextIntent = Object.freeze(api);
})();