(function() {
  'use strict';

  const ORIGIN_ACTIONS = Object.freeze({
    saveAssistantResponse: 'save_assistant_response',
    summarizeFile: 'summarize_file',
    summarizeFolder: 'summarize_folder',
    importMarkdown: 'import_markdown',
    createFromPreset: 'create_from_preset',
    aiDraft: 'create_ai_draft'
  });

  const FIELD_ORDER = Object.freeze([
    'tags',
    'type',
    'status',
    'source',
    'created_at',
    'origin_action'
  ]);

  const ORIGIN_DEFAULTS = Object.freeze({
    [ORIGIN_ACTIONS.saveAssistantResponse]: Object.freeze({
      tags: Object.freeze(['ai-response']),
      type: 'ai-response',
      status: 'draft',
      source: 'vitruvios'
    }),
    [ORIGIN_ACTIONS.summarizeFile]: Object.freeze({
      tags: Object.freeze(['ai-summary']),
      type: 'summary',
      status: 'draft',
      source: 'vitruvios'
    }),
    [ORIGIN_ACTIONS.summarizeFolder]: Object.freeze({
      tags: Object.freeze(['ai-summary']),
      type: 'summary',
      status: 'draft',
      source: 'vitruvios'
    }),
    [ORIGIN_ACTIONS.importMarkdown]: Object.freeze({
      tags: Object.freeze(['imported-note']),
      type: 'imported-note',
      status: 'draft',
      source: 'external-markdown'
    }),
    [ORIGIN_ACTIONS.createFromPreset]: Object.freeze({
      status: 'draft',
      source: 'preset'
    }),
    [ORIGIN_ACTIONS.aiDraft]: Object.freeze({
      tags: Object.freeze(['ai-draft']),
      type: 'ai-draft',
      status: 'draft',
      source: 'vitruvios'
    })
  });

  function buildGeneratedNoteMetadata(options) {
    options = options || {};
    const originAction = normalizeOriginAction(options.originAction);
    const defaults = ORIGIN_DEFAULTS[originAction] || {};
    const supplied = normalizeMetadata(options.metadata);
    const metadata = Object.assign({}, cloneMetadata(defaults), supplied, {
      created_at: formatDate(options.now),
      origin_action: originAction
    });
    delete metadata.created_by;
    return orderMetadata(metadata);
  }

  function applyGeneratedNoteMetadata(content, options) {
    const metadata = buildGeneratedNoteMetadata(options);
    return {
      content: mergeFrontmatter(String(content || ''), metadata),
      metadata
    };
  }

  function mergeFrontmatter(content, metadata) {
    const frontmatter = extractFrontmatter(content);
    if (!frontmatter) {
      return serializeFrontmatter(metadata) + '\n\n' + content.replace(/^\s+/, '');
    }

    const existingKeys = collectTopLevelKeys(frontmatter.body);
    let body = mergeTags(frontmatter.body, metadata.tags);
    FIELD_ORDER.forEach((key) => {
      if (key === 'tags' || existingKeys.has(key) || metadata[key] === undefined) return;
      body += (body.endsWith('\n') || !body ? '' : '\n') + serializeField(key, metadata[key]);
    });
    Object.keys(metadata).forEach((key) => {
      if (FIELD_ORDER.includes(key) || existingKeys.has(key) || metadata[key] === undefined) return;
      body += (body.endsWith('\n') || !body ? '' : '\n') + serializeField(key, metadata[key]);
    });
    return '---\n' + body.replace(/\n+$/g, '') + '\n---' + frontmatter.rest;
  }

  function extractFrontmatter(content) {
    const match = String(content || '').match(/^---\r?\n([\s\S]*?)\r?\n---(?=\r?\n|$)/);
    if (!match) return null;
    return {
      body: match[1],
      rest: content.slice(match[0].length)
    };
  }

  function collectTopLevelKeys(body) {
    const keys = new Set();
    String(body || '').split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s|$)/);
      if (match) keys.add(match[1]);
    });
    return keys;
  }

  function mergeTags(body, tags) {
    const additions = normalizeTags(tags);
    if (!additions.length) return body;
    const lines = String(body || '').split(/\r?\n/);
    const tagIndex = lines.findIndex((line) => /^tags:(?:\s|$)/.test(line));
    if (tagIndex === -1) {
      return (body ? body.replace(/\n+$/g, '') + '\n' : '') + serializeField('tags', additions);
    }

    const inline = lines[tagIndex].match(/^tags:\s*\[(.*)\]\s*$/);
    if (inline) {
      const current = inline[1].split(',').map((tag) => cleanTag(tag)).filter(Boolean);
      lines[tagIndex] = 'tags: [' + unique(current.concat(additions)).join(', ') + ']';
      return lines.join('\n');
    }

    if (/^tags:\s*\S+/.test(lines[tagIndex])) {
      const current = cleanTag(lines[tagIndex].replace(/^tags:\s*/, ''));
      lines[tagIndex] = 'tags:\n' + unique([current].concat(additions)).filter(Boolean).map((tag) => '  - ' + tag).join('\n');
      return lines.join('\n');
    }

    let endIndex = tagIndex + 1;
    const current = [];
    while (endIndex < lines.length && !/^[A-Za-z_][A-Za-z0-9_-]*:(?:\s|$)/.test(lines[endIndex])) {
      const match = lines[endIndex].match(/^\s*-\s+(.+?)\s*$/);
      if (match) current.push(cleanTag(match[1]));
      endIndex += 1;
    }
    const merged = unique(current.concat(additions)).filter(Boolean);
    lines.splice(tagIndex, endIndex - tagIndex, 'tags:', ...merged.map((tag) => '  - ' + tag));
    return lines.join('\n');
  }

  function serializeFrontmatter(metadata) {
    const lines = ['---'];
    Object.keys(metadata).forEach((key) => {
      lines.push(serializeField(key, metadata[key]));
    });
    lines.push('---');
    return lines.join('\n');
  }

  function serializeField(key, value) {
    if (Array.isArray(value)) {
      return key + ':\n' + value.map((item) => '  - ' + serializeScalar(item)).join('\n');
    }
    return key + ': ' + serializeScalar(value);
  }

  function serializeScalar(value) {
    const text = String(value === undefined || value === null ? '' : value).trim();
    if (/^[A-Za-z0-9_.:/-]+$/.test(text) && !/^(true|false|null|~|\d+(?:\.\d+)?)$/i.test(text)) return text;
    return JSON.stringify(text);
  }

  function normalizeMetadata(input) {
    const output = {};
    Object.entries(input && typeof input === 'object' ? input : {}).forEach(([key, value]) => {
      if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(key) || key === 'created_by' || value === undefined) return;
      if (key === 'tags') {
        output.tags = normalizeTags(value);
        return;
      }
      if (Array.isArray(value)) output[key] = value.map((item) => String(item).trim()).filter(Boolean);
      else output[key] = String(value).trim();
    });
    return output;
  }

  function normalizeTags(value) {
    const values = Array.isArray(value) ? value : (value ? [value] : []);
    return unique(values.map((tag) => cleanTag(tag)).filter(Boolean));
  }

  function cleanTag(value) {
    return String(value || '').trim().replace(/^["'#]+|["']+$/g, '');
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function cloneMetadata(input) {
    const output = {};
    Object.entries(input || {}).forEach(([key, value]) => {
      output[key] = Array.isArray(value) ? value.slice() : value;
    });
    return output;
  }

  function orderMetadata(metadata) {
    const ordered = {};
    FIELD_ORDER.forEach((key) => {
      if (metadata[key] !== undefined) ordered[key] = metadata[key];
    });
    Object.keys(metadata).sort().forEach((key) => {
      if (!Object.hasOwn(ordered, key)) ordered[key] = metadata[key];
    });
    return ordered;
  }

  function normalizeOriginAction(value) {
    const origin = String(value || '').trim();
    if (!Object.values(ORIGIN_ACTIONS).includes(origin)) {
      throw new Error('Unknown generated note origin action: ' + origin);
    }
    return origin;
  }

  function formatDate(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) throw new Error('Invalid generated note date.');
    return [date.getFullYear(), padDatePart(date.getMonth() + 1), padDatePart(date.getDate())].join('-');
  }

  function padDatePart(value) {
    return String(value).padStart(2, '0');
  }

  const api = {
    ORIGIN_ACTIONS,
    applyGeneratedNoteMetadata,
    buildGeneratedNoteMetadata
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosGeneratedNoteMetadata = Object.freeze(api);
})();
