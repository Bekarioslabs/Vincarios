(function() {
  'use strict';

  const MAX_FRONTMATTER_CHARS = 64 * 1024;
  const MAX_FLOW_NESTING = 32;
  const MAX_ALIAS_COUNT = 50;

  function readFrontmatter(source) {
    const normalized = normalizeSource(source);
    const block = extractFrontmatterBlock(normalized);
    if (!block) return createPlainResult(normalized);

    if (block.yaml.length > MAX_FRONTMATTER_CHARS) {
      return createFailureResult(normalized, 'size_limit', 'Frontmatter exceeds the supported size limit.');
    }
    if (getMaximumFlowNesting(block.yaml) > MAX_FLOW_NESTING) {
      return createFailureResult(normalized, 'nesting_limit', 'Frontmatter exceeds the supported flow nesting limit.');
    }

    try {
      const yaml = getYamlApi();
      const document = yaml.parseDocument(block.yaml, {
        maxAliasCount: MAX_ALIAS_COUNT,
        prettyErrors: false,
        strict: false,
        uniqueKeys: false
      });
      if (document.errors && document.errors.length) {
        return createFailureResult(normalized, 'parse_error', document.errors[0].message || 'Frontmatter could not be parsed.');
      }
      if (document.contents && !yaml.isMap(document.contents)) {
        return createFailureResult(normalized, 'invalid_root', 'Frontmatter must be a YAML mapping.');
      }

      const metadata = document.toJS({ maxAliasCount: MAX_ALIAS_COUNT }) || {};
      if (!isRecord(metadata)) {
        return createFailureResult(normalized, 'invalid_root', 'Frontmatter must resolve to a YAML mapping.');
      }
      return {
        ok: true,
        code: '',
        message: '',
        hasFrontmatter: true,
        body: block.body,
        document,
        metadata,
        properties: buildProperties(metadata)
      };
    } catch (error) {
      return createFailureResult(normalized, 'parse_error', describeError(error));
    }
  }

  function applyTags(source, tags) {
    const parsed = readFrontmatter(source);
    if (!parsed.ok) return createWriteFailure(parsed, source);

    try {
      const document = parsed.hasFrontmatter ? parsed.document : createEmptyDocument();
      const mergedTags = uniqueTags(getTags(parsed.metadata).concat(tags || []));
      document.set('tags', mergedTags);
      return createWriteResult(document, parsed.hasFrontmatter ? parsed.body : normalizeSource(source));
    } catch (error) {
      return createWriteFailure(parsed, source, describeError(error));
    }
  }

  function mergeMetadata(source, defaults) {
    const parsed = readFrontmatter(source);
    if (!parsed.ok) return createWriteFailure(parsed, source);

    try {
      const document = parsed.hasFrontmatter ? parsed.document : createEmptyDocument();
      const current = parsed.metadata;
      const next = isRecord(defaults) ? defaults : {};
      Object.keys(next).forEach((key) => {
        if (key === 'tags') {
          document.set('tags', uniqueTags(getTags(current).concat(next.tags || [])));
          return;
        }
        if (!Object.hasOwn(current, key)) document.set(key, next[key]);
      });
      const body = parsed.hasFrontmatter
        ? parsed.body
        : '\n' + normalizeSource(source).replace(/^\s+/, '');
      return createWriteResult(document, body);
    } catch (error) {
      return createWriteFailure(parsed, source, describeError(error));
    }
  }

  function getTags(metadata) {
    return uniqueTags(metadata && metadata.tags);
  }

  function getSearchFields(metadata) {
    const source = isRecord(metadata) ? metadata : {};
    return {
      tags: getTags(source),
      type: normalizeSearchValue(source.type),
      status: normalizeSearchValue(source.status),
      aliases: uniqueTags(source.aliases)
    };
  }

  function normalizeSearchValue(value) {
    if (Array.isArray(value)) return value.map((entry) => String(entry == null ? '' : entry).trim()).filter(Boolean).join(', ');
    return String(value == null ? '' : value).trim();
  }

  function extractFrontmatterBlock(source) {
    const match = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(source);
    if (!match) return null;
    return {
      yaml: match[1],
      body: source.slice(match[0].length)
    };
  }

  function createPlainResult(source) {
    return {
      ok: true,
      code: '',
      message: '',
      hasFrontmatter: false,
      body: source,
      document: null,
      metadata: {},
      properties: []
    };
  }

  function createFailureResult(source, code, message) {
    return {
      ok: false,
      code,
      message,
      hasFrontmatter: false,
      body: source,
      document: null,
      metadata: {},
      properties: []
    };
  }

  function createWriteResult(document, body) {
    const yaml = String(document.toString({ lineWidth: 0 }) || '').replace(/\n$/, '');
    const content = '---\n' + yaml + '\n---\n' + body;
    const parsed = readFrontmatter(content);
    if (!parsed.ok) return createWriteFailure(parsed, content);
    return {
      ok: true,
      code: '',
      message: '',
      content,
      metadata: parsed.metadata,
      properties: parsed.properties
    };
  }

  function createWriteFailure(parsed, source, fallbackMessage) {
    return {
      ok: false,
      code: parsed && parsed.code ? parsed.code : 'write_error',
      message: fallbackMessage || (parsed && parsed.message) || 'Frontmatter could not be updated safely.',
      content: String(source || ''),
      metadata: parsed && parsed.metadata ? parsed.metadata : {},
      properties: parsed && parsed.properties ? parsed.properties : []
    };
  }

  function createEmptyDocument() {
    const yaml = getYamlApi();
    const document = new yaml.Document({});
    if (!document.contents || !yaml.isMap(document.contents)) throw new Error('Could not create YAML mapping document.');
    return document;
  }

  function buildProperties(metadata) {
    return Object.keys(metadata || {}).map((key) => ({
      key,
      value: formatPropertyValue(metadata[key])
    }));
  }

  function formatPropertyValue(value) {
    if (Array.isArray(value)) return value.map(formatPropertyValue).join(', ');
    if (value && typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (error) {
        return '[Unsupported value]';
      }
    }
    return String(value == null ? '' : value);
  }

  function uniqueTags(value) {
    const input = Array.isArray(value) ? value : [value];
    const seen = new Set();
    return input.reduce((tags, entry) => {
      const normalized = String(entry == null ? '' : entry).trim().replace(/^#/, '');
      if (!normalized || seen.has(normalized)) return tags;
      seen.add(normalized);
      tags.push(normalized);
      return tags;
    }, []);
  }

  function getMaximumFlowNesting(source) {
    let depth = 0;
    let maximum = 0;
    let quote = '';
    let escaped = false;
    let comment = false;
    const text = String(source || '');
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (comment) {
        if (character === '\n') comment = false;
        continue;
      }
      if (quote) {
        if (quote === '"' && character === '\\' && !escaped) {
          escaped = true;
          continue;
        }
        if (character === quote && !escaped) quote = '';
        escaped = false;
        continue;
      }
      if (character === '"' || character === "'") {
        quote = character;
        continue;
      }
      if (character === '#') {
        comment = true;
        continue;
      }
      if (character === '[' || character === '{') {
        depth += 1;
        maximum = Math.max(maximum, depth);
      } else if (character === ']' || character === '}') {
        depth = Math.max(0, depth - 1);
      }
    }
    return maximum;
  }

  function normalizeSource(value) {
    return String(value || '').replace(/\r\n/g, '\n');
  }

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function describeError(error) {
    return error && error.message ? String(error.message) : 'Frontmatter could not be parsed.';
  }

  function getYamlApi() {
    if (typeof window !== 'undefined' && window.VitruviosYamlRuntime) return window.VitruviosYamlRuntime;
    if (typeof module !== 'undefined' && module.exports) return require('yaml');
    throw new Error('YAML runtime unavailable.');
  }

  const api = {
    MAX_FLOW_NESTING,
    MAX_FRONTMATTER_CHARS,
    applyTags,
    getTags,
    getSearchFields,
    mergeMetadata,
    readFrontmatter
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosFrontmatterContract = Object.freeze(api);
})();
