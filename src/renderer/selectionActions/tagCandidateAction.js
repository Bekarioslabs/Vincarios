(function() {
  'use strict';

  const STANDARD_FILE_ROLE_TAGS = Object.freeze({
    references: 'references',
    tasks: 'tasks',
    decisions: 'decisions',
    instructions: 'instructions',
    log: 'log',
    brainstorm: 'brainstorm',
    readme: 'readme'
  });
  const STRUCTURAL_FOLDER_TAGS = Object.freeze(new Set([
    'wiki', 'characters', 'character', 'research', 'references', 'assets', 'visual', 'visuals', 'knowledge', 'ai-responses'
  ]));
  const SYSTEM_ROLE_NAMES = Object.freeze(new Set(['inbox', 'daily', 'projects', 'knowledge', 'brain', 'archive']));
  const DOCUMENT_TYPE_PREFIX_TAGS = Object.freeze({
    summary: 'summary'
  });
  const MAX_TAGS = 5;

  function buildTagCandidates(input) {
    input = input || {};
    const path = normalizePath(input.path);
    const content = String(input.content || '');
    if (!path || !content) return fail('missing_input', 'Tag candidates need a Markdown path and loaded content.');

    const existingTags = extractTags(content);
    const suggestedTags = suggestTags(path, content, existingTags, input.maxTags || MAX_TAGS, input.vaultProfile);
    if (!suggestedTags.length) return fail('no_tag_candidates', 'No useful missing tag candidates found.');

    const proposedContent = applyTagsToMarkdown(content, existingTags.concat(suggestedTags));
    if (proposedContent === content) return fail('no_tag_candidates', 'No metadata changes needed.');

    const title = 'Suggested tags: ' + suggestedTags.join(', ');
    return {
      ok: true,
      group: {
        id: 'tag-candidates:' + path,
        title: 'Tag candidates for: ' + path,
        source: 'file.suggestTags',
        summary: suggestedTags.length + ' missing tag' + (suggestedTags.length === 1 ? '' : 's'),
        items: [{
          id: 'tags:' + path,
          title,
          path,
          detail: 'Adds missing YAML tags: ' + suggestedTags.join(', '),
          scoreLabel: 'metadata',
          scoreText: suggestedTags.length + ' tag' + (suggestedTags.length === 1 ? '' : 's'),
          scoreTone: 'yellow',
          kind: 'metadata_candidate',
          checked: false,
          data: {
            targetPath: path,
            currentContent: content,
            proposedContent,
            reason: 'Local path/title heuristic suggested missing tags: ' + suggestedTags.join(', '),
            tags: suggestedTags
          }
        }]
      }
    };
  }

  function suggestTags(path, content, existingTags, maxTags, vaultProfile) {
    const existing = new Set((existingTags || []).map(normalizeTag).filter(Boolean));
    const tags = [];
    const parts = normalizePath(path).split('/').filter(Boolean);
    const fileName = parts.length ? parts[parts.length - 1].replace(/\.md$/i, '') : '';
    const context = buildPathContext(parts, vaultProfile);

    addTag(tags, existing, context.projectName);
    addTag(tags, existing, getStandardFileRoleTag(fileName));
    addTag(tags, existing, getDocumentTypePrefixTag(fileName));
    getStructuralFolderTags(context.relativeFolders).forEach((tag) => addTag(tags, existing, tag));
    getIdentifierTags(fileName).forEach((tag) => addTag(tags, existing, tag));
    extractTitleSources(content, fileName).forEach((heading) => {
      getTitleTags(heading).forEach((tag) => addTag(tags, existing, tag));
    });

    return tags.slice(0, normalizeMaxTags(maxTags));
  }

  function buildPathContext(parts, vaultProfile) {
    const folders = normalizeRoleFolders(vaultProfile);
    const projectRoot = folders.projects;
    const path = parts.join('/');
    if (projectRoot && (path === projectRoot || path.startsWith(projectRoot + '/'))) {
      const rootDepth = projectRoot.split('/').filter(Boolean).length;
      const projectName = parts[rootDepth] || '';
      return {
        role: 'projects',
        projectName,
        relativeFolders: parts.slice(rootDepth + 1, -1)
      };
    }

    const matchedRole = Object.keys(folders).find((role) => {
      const rolePath = folders[role];
      return rolePath && (path === rolePath || path.startsWith(rolePath + '/'));
    });
    if (matchedRole) {
      const rootDepth = folders[matchedRole].split('/').filter(Boolean).length;
      return {
        role: matchedRole,
        projectName: '',
        relativeFolders: parts.slice(rootDepth, -1)
      };
    }

    return { role: '', projectName: '', relativeFolders: parts.slice(0, -1) };
  }

  function normalizeRoleFolders(vaultProfile) {
    const defaults = getDefaultRoleFolders();
    const custom = vaultProfile && vaultProfile.folders ? vaultProfile.folders : {};
    return Object.assign({}, defaults, normalizeFolderMap(custom));
  }

  function getDefaultRoleFolders() {
    const profileApi = getVaultProfileApi();
    if (profileApi && profileApi.DEFAULT_FOLDERS) return normalizeFolderMap(profileApi.DEFAULT_FOLDERS);
    return normalizeFolderMap({
      inbox: '00_Inbox',
      daily: '01_Daily',
      projects: '02_Projects',
      knowledge: '03_Knowledge',
      brain: '90_AI_Brain',
      archive: '99_Archive'
    });
  }

  function normalizeFolderMap(folders) {
    return Object.keys(folders || {}).reduce((result, role) => {
      const normalizedRole = String(role || '').trim();
      if (!normalizedRole) return result;
      const value = normalizePath(folders[role]);
      if (value) result[normalizedRole] = value;
      return result;
    }, {});
  }

  function getStandardFileRoleTag(fileName) {
    const normalized = normalizeTag(fileName);
    return STANDARD_FILE_ROLE_TAGS[normalized] || '';
  }
  function getDocumentTypePrefixTag(fileName) {
    const firstSegment = splitDocumentNameSegments(fileName)[0] || '';
    return DOCUMENT_TYPE_PREFIX_TAGS[normalizeTag(firstSegment)] || '';
  }

  function splitDocumentNameSegments(fileName) {
    return String(fileName || '').split(/\s+-\s+|[_]+/).map((part) => part.trim()).filter(Boolean);
  }

  function getStructuralFolderTags(folders) {
    const tags = [];
    (folders || []).forEach((folder) => {
      const normalized = normalizeTag(folder);
      if (!normalized || SYSTEM_ROLE_NAMES.has(normalized)) return;
      if (STRUCTURAL_FOLDER_TAGS.has(normalized) && !tags.includes(normalized)) tags.push(normalized);
    });
    return tags;
  }

  function getIdentifierTags(fileName) {
    if (!isIdentifierLikeName(fileName)) return [];
    return tokenizeTagSource(fileName);
  }

  function getTitleTags(title) {
    if (looksLikeSentence(title)) {
      if (/[?!]/.test(String(title || ''))) return [];
      return getProperNameTags(title);
    }
    if (isIdentifierLikeName(title)) return tokenizeTagSource(title);
    return getProperNameTags(title);
  }

  function extractTitleSources(content, fileName) {
    const normalizedFileName = normalizeComparableTitle(fileName);
    const sources = extractHeadingWords(content).filter((source) => normalizeComparableTitle(source) !== normalizedFileName);
    const firstLine = getFirstMeaningfulLine(content);
    if (firstLine && normalizeComparableTitle(firstLine) !== normalizedFileName && !sources.includes(firstLine)) sources.push(firstLine);
    return sources;
  }

  function normalizeComparableTitle(value) {
    return normalizeTag(String(value || '').replace(/\\.md$/i, ''));
  }

  function getFirstMeaningfulLine(content) {
    const frontmatter = extractFrontmatter(content);
    const body = frontmatter ? frontmatter.rest : String(content || '');
    const line = body.split(/\r?\n/).map((entry) => entry.trim()).find((entry) => entry && !/^[-*_`>#]/.test(entry));
    if (!line || line.length > 90) return '';
    return line;
  }

  function getProperNameTags(value) {
    const words = String(value || '').match(/[A-Z\u00c0-\u024f][A-Za-z0-9\u00c0-\u024f]*/g) || [];
    const sequence = [];
    words.forEach((word) => {
      if (word.length > 1) sequence.push(word);
    });
    if (sequence.length >= 2) return [normalizeTag(sequence.slice(-2).join('-'))].filter(Boolean);
    return [];
  }

  function isIdentifierLikeName(value) {
    const text = String(value || '').trim();
    if (!text || looksLikeSentence(text)) return false;
    if (/[_-]/.test(text)) return true;
    const words = splitWords(text);
    if (words.length === 1) return true;
    return words.length <= 3 && words.every((word) => /^[A-Z0-9\u00c0-\u024f]/.test(word));
  }

  function looksLikeSentence(value) {
    const text = String(value || '').trim();
    if (!text) return false;
    if (/[?!]/.test(text)) return true;
    if (/[.,;:]/.test(text)) return true;
    const words = splitWords(text);
    if (words.length >= 6) return true;
    const shortWords = words.filter((word) => word.length <= 3).length;
    return words.length >= 4 && shortWords >= Math.ceil(words.length / 2);
  }

  function splitWords(value) {
    return String(value || '').replace(/^\d+[_.\-\s]+/, '').split(/[^A-Za-z0-9\u00c0-\u024f]+/).filter(Boolean);
  }


  function addTag(tags, existing, value) {
    const normalized = normalizeTag(value);
    if (!isUsableTag(normalized) || existing.has(normalized) || tags.includes(normalized)) return;
    tags.push(normalized);
  }

  function isUsableTag(tag) {
    return !!tag && tag.length >= 3 && !/^\d+$/.test(tag) && !SYSTEM_ROLE_NAMES.has(tag);
  }

  function extractTags(content) {
    const frontmatter = extractFrontmatter(content);
    if (!frontmatter) return [];
    const lines = frontmatter.body.split(/\r?\n/);
    const tags = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const inline = line.match(/^tags:\s*\[(.*)\]\s*$/i);
      if (inline) {
        inline[1].split(',').forEach((tag) => pushTag(tags, tag));
        continue;
      }
      if (/^tags:\s*$/i.test(line)) {
        for (let inner = index + 1; inner < lines.length; inner += 1) {
          const match = lines[inner].match(/^\s*-\s+(.+)\s*$/);
          if (!match) break;
          pushTag(tags, match[1]);
          index = inner;
        }
      }
    }
    return tags;
  }

  function applyTagsToMarkdown(content, tags) {
    const normalizedTags = uniqueTags(tags);
    if (!normalizedTags.length) return content;
    const frontmatter = extractFrontmatter(content);
    const tagBlock = formatTagBlock(normalizedTags);
    if (!frontmatter) return '---\n' + tagBlock + '\n---\n' + content;

    const lines = frontmatter.body.split(/\r?\n/);
    const replaced = [];
    let consumedTags = false;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^tags:\s*(\[.*\])?\s*$/i.test(line)) {
        if (!consumedTags) {
          replaced.push(tagBlock);
          consumedTags = true;
        }
        if (/^tags:\s*$/i.test(line)) {
          while (index + 1 < lines.length && /^\s*-\s+/.test(lines[index + 1])) index += 1;
        }
        continue;
      }
      replaced.push(line);
    }
    if (!consumedTags) replaced.unshift(tagBlock);
    return '---\n' + replaced.join('\n') + '\n---' + frontmatter.rest;
  }

  function extractFrontmatter(content) {
    const text = String(content || '').replace(/\r\n/g, '\n');
    if (!text.startsWith('---\n')) return null;
    const end = text.indexOf('\n---\n', 4);
    if (end === -1) return null;
    return {
      body: text.slice(4, end),
      rest: text.slice(end + 4)
    };
  }

  function extractHeadingWords(content) {
    const match = String(content || '').match(/^#\s+(.+)$/m);
    return match ? [match[1]] : [];
  }

  function tokenizeTagSource(value) {
    const raw = String(value || '').replace(/\.md$/i, '');
    const cleanedSource = raw.replace(/^\d+[_\-\s.]+/, '');
    const tokens = cleanedSource.split(/[^A-Za-z0-9\u00c0-\u024f]+/).map(normalizeTag).filter(isUsableTag);
    return tokens.filter((tag, index) => tokens.indexOf(tag) === index);
  }

  function normalizeTag(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u00e0-\u024f]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function uniqueTags(tags) {
    const seen = new Set();
    const result = [];
    (tags || []).forEach((tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      result.push(normalized);
    });
    return result;
  }

  function pushTag(tags, value) {
    const normalized = normalizeTag(String(value || '').replace(/^#/, ''));
    if (normalized && !tags.includes(normalized)) tags.push(normalized);
  }

  function formatTagBlock(tags) {
    return 'tags:\n' + uniqueTags(tags).map((tag) => '  - ' + tag).join('\n');
  }

  function normalizePath(value) {
    return String(value || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  }

  function normalizeMaxTags(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.min(Math.floor(number), 12) : MAX_TAGS;
  }

  function fail(code, message) {
    return { ok: false, code, message };
  }

    function getVaultProfileApi() {
    if (typeof window !== 'undefined' && window.VitruviosVaultProfile) return window.VitruviosVaultProfile;
    if (typeof module !== 'undefined' && module.exports) {
      try {
        return require('../../shared/vaultProfile/defaults');
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  const api = { buildTagCandidates, suggestTags, extractTags, applyTagsToMarkdown };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosTagCandidateAction = Object.freeze(api);
})();
