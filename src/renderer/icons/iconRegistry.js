(function() {
  'use strict';

  const ICONS = Object.freeze({
    folder: 'folder.svg',
    markdownFile: 'file-text.svg',
    file: 'file.svg',
    image: 'image.svg',
    settings: 'settings.svg',
    plug: 'plug.svg',
    refresh: 'refresh-cw.svg',
    chevronLeft: 'chevron-left.svg',
    chevronRight: 'chevron-right.svg',
    chevronDown: 'chevron-down.svg',
    copy: 'copy.svg',
    save: 'save.svg',
    close: 'x.svg',
    check: 'check.svg',
    warning: 'triangle-alert.svg',
    lock: 'lock.svg',
    search: 'search.svg',
    metadata: 'file-text.svg',
    send: 'arrow-up.svg',
    edit: 'square-pen.svg',
    actionSummary: 'file-text.svg',
    actionContextFile: 'link.svg',
    actionSimilar: 'search.svg',
    actionTags: 'tag.svg',
    actionUpdate: 'square-pen.svg',
    actionContextFolder: 'folder.svg',
    actionListFolder: 'list-tree.svg',
    actionAnalyzeFolder: 'search.svg',
    actionSummaryFolder: 'file-text.svg',
    actionProvider: 'sparkles.svg',
actionEmbedding: 'cpu.svg',
    navigationChat: 'sparkles.svg',
    navigationSuggestions: 'search.svg',
    navigationSessionLog: 'list-tree.svg',
    navigationNewNote: 'square-pen.svg',
    navigationNewProject: 'folder.svg',
    navigationOpenVault: 'folder.svg',
    navigationInboxReview: 'file-text.svg',
    navigationReviewBasket: 'check.svg',
    folderVisualInbox: 'inbox.svg',
    folderVisualCalendar: 'calendar.svg',
    folderVisualBriefcase: 'briefcase-business.svg',
    folderVisualBook: 'book-open.svg',
    folderVisualBrain: 'brain.svg',
    folderVisualArchive: 'archive.svg',
    folderVisualStar: 'star.svg',
    folderVisualCompass: 'compass.svg',
    folderVisualLayers: 'layers.svg'
  });

  const FOLDER_VISUAL_ICON_NAMES = Object.freeze({
    folder: 'folder',
    inbox: 'folderVisualInbox',
    calendar: 'folderVisualCalendar',
    briefcase: 'folderVisualBriefcase',
    book: 'folderVisualBook',
    brain: 'folderVisualBrain',
    archive: 'folderVisualArchive',
    star: 'folderVisualStar',
    compass: 'folderVisualCompass',
    layers: 'folderVisualLayers'
  });

  function resolveFolderVisualIconName(iconKey) {
    return FOLDER_VISUAL_ICON_NAMES[iconKey] || 'folder';
  }

  const api = { ICONS, FOLDER_VISUAL_ICON_NAMES, resolveFolderVisualIconName };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosIconRegistry = Object.freeze(api);
})();