(function() {
  'use strict';

  const FOLDER_ROLES = Object.freeze({
    inbox: 'inbox',
    daily: 'daily',
    projects: 'projects',
    knowledge: 'knowledge',
    brain: 'brain',
    archive: 'archive'
  });

  const DEFAULT_FOLDERS = Object.freeze({
    [FOLDER_ROLES.inbox]: '00_Inbox',
    [FOLDER_ROLES.daily]: '01_Daily',
    [FOLDER_ROLES.projects]: '02_Projects',
    [FOLDER_ROLES.knowledge]: '03_Knowledge',
    [FOLDER_ROLES.brain]: '90_AI_Brain',
    [FOLDER_ROLES.archive]: '99_Archive'
  });

  const DEFAULT_VAULT_PROFILE = Object.freeze(Object.assign(createLegacyFolderAliases(DEFAULT_FOLDERS), {
    folders: DEFAULT_FOLDERS
  }));

  function createVaultProfile(overrides) {
    const input = overrides || {};
    const folders = Object.freeze(Object.assign({}, DEFAULT_FOLDERS, normalizeFolderMap(input.folders || {})));
    return Object.freeze(Object.assign(createLegacyFolderAliases(folders), input, { folders }));
  }

  function getFolderRolePath(profile, role) {
    const currentProfile = profile || DEFAULT_VAULT_PROFILE;
    const folders = currentProfile.folders || DEFAULT_FOLDERS;
    const normalizedRole = String(role || '').trim();
    const value = folders[normalizedRole];
    if (!value) throw new Error('Unknown folder role: ' + normalizedRole);
    return normalizeFolderPath(value);
  }

  function joinFolderRolePath(profile, role, childPath) {
    const base = getFolderRolePath(profile, role);
    const child = normalizeFolderPath(childPath || '');
    return child ? base + '/' + child : base;
  }

  function normalizeFolderMap(folders) {
    return Object.keys(folders).reduce((result, role) => {
      const value = normalizeFolderPath(folders[role]);
      if (value) result[role] = value;
      return result;
    }, {});
  }

  function normalizeFolderPath(value) {
    return String(value || '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/+/g, '/');
  }

  function createLegacyFolderAliases(folders) {
    return {
      inboxDir: folders.inbox,
      dailyDir: folders.daily,
      projectsDir: folders.projects,
      knowledgeDir: folders.knowledge,
      brainDir: folders.brain,
      archiveDir: folders.archive
    };
  }

  const api = {
    FOLDER_ROLES,
    DEFAULT_FOLDERS,
    DEFAULT_VAULT_PROFILE,
    createVaultProfile,
    getFolderRolePath,
    joinFolderRolePath
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusVaultProfile = Object.freeze(api);
})();
