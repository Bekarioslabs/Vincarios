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
      source: 'vincarios'
    }),
    [ORIGIN_ACTIONS.summarizeFile]: Object.freeze({
      tags: Object.freeze(['ai-summary']),
      type: 'summary',
      status: 'draft',
      source: 'vincarios'
    }),
    [ORIGIN_ACTIONS.summarizeFolder]: Object.freeze({
      tags: Object.freeze(['ai-summary']),
      type: 'summary',
      status: 'draft',
      source: 'vincarios'
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
      source: 'vincarios'
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
    const contractResult = getFrontmatterContract().mergeMetadata(String(content || ''), metadata);
    return {
      content: contractResult.content,
      metadata: contractResult.ok ? contractResult.metadata : metadata,
      frontmatterError: contractResult.ok ? null : {
        code: contractResult.code,
        message: contractResult.message
      }
    };
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

  function getFrontmatterContract() {
    if (typeof window !== 'undefined' && window.VincariosFrontmatterContract) return window.VincariosFrontmatterContract;
    if (typeof module !== 'undefined' && module.exports) return require('./frontmatterContract');
    throw new Error('Frontmatter contract unavailable.');
  }

  const api = {
    ORIGIN_ACTIONS,
    applyGeneratedNoteMetadata,
    buildGeneratedNoteMetadata
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosGeneratedNoteMetadata = Object.freeze(api);
})();
