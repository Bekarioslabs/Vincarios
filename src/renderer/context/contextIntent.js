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
    return (mentionsFileCollection(value) && (asksForSimilarity(value) || asksToFindOrList(value))) || asksForFolderContents(value);
  }

  function mentionsFolder(value) {
    return /\b(diesem|diesen|dieser|selected|current|this)\b.*\b(ordner|folder)\b/.test(value) || /\b(ordner|folder)\b/.test(value);
  }

  function mentionsFileCollection(value) {
    return /\b(datei(en)?|files?|notes?|notiz(en)?)\b/.test(value);
  }


  function asksForFolderContents(value) {
    return mentionsFolder(value) && /\b(was|what|whats|what's|liegt|drin|inhalt|inhalte|contents?|inside)\b/.test(value);
  }
  function asksForSimilarity(value) {
    return /\b(aehnlich|aehnliche|ahnlich|ahnliche|similar|vergleichbar|related)\b/.test(value);
  }

  function asksToFindOrList(value) {
    return /\b(find|finde|finden|suche|suchen|search|liste|listen|auflisten|zeige|zeig)\b/.test(value);
  }

  function normalizePromptText(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  const api = {
    looksLikeSelectedTargetRequest,
    looksLikeFolderScopedRequest,
    hasFolderWorkSignal
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusContextIntent = Object.freeze(api);
})();
