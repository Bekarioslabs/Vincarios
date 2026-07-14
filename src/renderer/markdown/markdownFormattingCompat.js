(function() {
  'use strict';

  const COLOR_CLASS_BY_HEX = Object.freeze({
    '#17365d': 'markdown-color-office-blue',
    '#9bbb59': 'markdown-color-office-green',
    '#c0504d': 'markdown-color-office-red',
    '#ff4d4f': 'markdown-color-alert-red'
  });

  const BACKGROUND_CLASS_BY_HEX = Object.freeze({
    '#affad1': 'markdown-bg-mint',
    '#d3f8b6': 'markdown-bg-green',
    '#ff4d4f': 'markdown-bg-red'
  });

  const INLINE_TAG_RULES = Object.freeze({
    font: {
      tag: 'font',
      token: 'vitruvios_format_font_color',
      classPrefix: 'markdown-format-color',
      attrPattern: /\scolor\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i,
      classByValue: COLOR_CLASS_BY_HEX
    },
    mark: {
      tag: 'mark',
      token: 'vitruvios_format_background',
      classPrefix: 'markdown-format-background',
      attrPattern: /\sstyle\s*=\s*(?:"([^"]+)"|'([^']+)')/i,
      styleProperty: 'background',
      classByValue: BACKGROUND_CLASS_BY_HEX
    },
    underline: {
      tag: 'u',
      token: 'vitruvios_format_underline',
      className: 'markdown-format-underline'
    },
    superscript: {
      tag: 'sup',
      token: 'vitruvios_format_superscript',
      className: 'markdown-format-superscript'
    },
    subscript: {
      tag: 'sub',
      token: 'vitruvios_format_subscript',
      className: 'markdown-format-subscript'
    }
  });

  function useMarkdownFormattingCompat(md) {
    Object.keys(INLINE_TAG_RULES).forEach((ruleName) => {
      const rule = INLINE_TAG_RULES[ruleName];
      md.inline.ruler.before('html_inline', rule.token, createInlineRule(md, rule));
      md.renderer.rules[rule.token] = renderFormattingToken;
      if (rule.tag === 'font' || rule.tag === 'mark') {
        const fallbackToken = rule.token + '_fallback';
        md.inline.ruler.before('html_inline', fallbackToken, createFallbackRule(md, rule));
        md.renderer.rules[fallbackToken] = renderFallbackToken;
      }
    });
  }

  function createInlineRule(md, rule) {
    return function parseFormattingToken(state, silent) {
      const parsed = parseAllowedInlineTag(state.src, state.pos, rule);
      if (!parsed) return false;
      if (!silent) {
        const token = state.push(rule.token, 'span', 0);
        token.meta = {
          className: parsed.className,
          content: parsed.content,
          children: []
        };
        md.inline.parse(parsed.content, state.md, state.env, token.meta.children);
      }
      state.pos = parsed.nextPos;
      return true;
    };
  }

  function createFallbackRule(md, rule) {
    return function parseFormattingFallback(state, silent) {
      const parsed = parsePlainInlineTag(state.src, state.pos, rule.tag);
      if (!parsed) return false;
      if (!silent) {
        const token = state.push(rule.token + '_fallback', '', 0);
        token.meta = { children: [] };
        md.inline.parse(parsed.content, state.md, state.env, token.meta.children);
      }
      state.pos = parsed.nextPos;
      return true;
    };
  }

  function parseAllowedInlineTag(source, pos, rule) {
    const openPrefix = '<' + rule.tag;
    if (!source.slice(pos, pos + openPrefix.length).toLowerCase().startsWith(openPrefix)) return null;
    const openEnd = source.indexOf('>', pos + openPrefix.length);
    if (openEnd === -1) return null;
    const openTag = source.slice(pos, openEnd + 1);
    if (!isPlainOpeningTag(openTag, rule.tag)) return null;

    const className = resolveClassName(openTag, rule);
    if (!className) return null;

    const closeTag = '</' + rule.tag + '>';
    const closeStart = source.toLowerCase().indexOf(closeTag, openEnd + 1);
    if (closeStart === -1 || closeStart === openEnd + 1) return null;

    return {
      className,
      content: source.slice(openEnd + 1, closeStart),
      nextPos: closeStart + closeTag.length
    };
  }

  function parsePlainInlineTag(source, pos, tagName) {
    const openPrefix = '<' + tagName;
    if (!source.slice(pos, pos + openPrefix.length).toLowerCase().startsWith(openPrefix)) return null;
    const openEnd = source.indexOf('>', pos + openPrefix.length);
    if (openEnd === -1) return null;
    const openTag = source.slice(pos, openEnd + 1);
    if (!new RegExp('^<' + tagName + '(?:\\s[^>]*)?>$', 'i').test(openTag)) return null;
    const closeTag = '</' + tagName + '>';
    const closeStart = source.toLowerCase().indexOf(closeTag, openEnd + 1);
    if (closeStart === -1 || closeStart === openEnd + 1) return null;
    return {
      content: source.slice(openEnd + 1, closeStart),
      nextPos: closeStart + closeTag.length
    };
  }

  function isPlainOpeningTag(openTag, tagName) {
    return new RegExp('^<' + tagName + '(?:\\s[^>]*)?>$', 'i').test(openTag) &&
      !/\son[a-z]+\s*=/i.test(openTag) &&
      !/\s(?:href|src)\s*=/i.test(openTag);
  }

  function resolveClassName(openTag, rule) {
    if (rule.className) return rule.className;
    const raw = extractRawValue(openTag, rule);
    const normalized = normalizeColor(raw);
    if (!normalized) return null;
    const colorClass = rule.classByValue[normalized];
    return colorClass ? rule.classPrefix + ' ' + colorClass : null;
  }

  function extractRawValue(openTag, rule) {
    const match = openTag.match(rule.attrPattern);
    const raw = match && (match[1] || match[2] || match[3]);
    if (!raw) return '';
    if (!rule.styleProperty) return raw;
    const properties = raw.split(';');
    for (const property of properties) {
      const separator = property.indexOf(':');
      if (separator === -1) continue;
      const name = property.slice(0, separator).trim().toLowerCase();
      if (name === rule.styleProperty || name === 'background-color') {
        return property.slice(separator + 1).trim();
      }
    }
    return '';
  }

  function normalizeColor(value) {
    const color = String(value || '').trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(color)) return color;
    if (/^#[0-9a-f]{3}$/.test(color)) {
      return '#' + color.slice(1).split('').map((char) => char + char).join('');
    }
    return '';
  }

  function renderFormattingToken(tokens, index, options, env, renderer) {
    const meta = tokens[index].meta || {};
    const children = Array.isArray(meta.children) ? meta.children : [];
    return '<span class="' + escapeHtml(meta.className || '') + '">' +
      renderer.renderInline(children, options, env) +
      '</span>';
  }

  function renderFallbackToken(tokens, index, options, env, renderer) {
    const meta = tokens[index].meta || {};
    const children = Array.isArray(meta.children) ? meta.children : [];
    return renderer.renderInline(children, options, env);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const api = {
    useMarkdownFormattingCompat,
    normalizeColor,
    INLINE_TAG_RULES,
    COLOR_CLASS_BY_HEX,
    BACKGROUND_CLASS_BY_HEX
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownFormattingCompat = Object.freeze(api);
})();
