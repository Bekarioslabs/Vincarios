(function() {
  'use strict';

  function splitFrontmatter(source) {
    const normalized = String(source || '').replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) return { properties: [], body: normalized };

    const endIndex = normalized.indexOf('\n---', 4);
    if (endIndex === -1) return { properties: [], body: normalized };

    const afterMarker = normalized.slice(endIndex + 4);
    return {
      properties: parseFrontmatter(normalized.slice(4, endIndex)),
      body: afterMarker.startsWith('\n') ? afterMarker.slice(1) : afterMarker
    };
  }

  function parseFrontmatter(frontmatter) {
    const properties = [];
    let current = null;

    String(frontmatter || '').split('\n').forEach((line) => {
      const keyValue = line.match(/^([^:#][^:]*):\s*(.*)$/);
      if (keyValue) {
        current = {
          key: keyValue[1].trim(),
          value: normalizePropertyValue(keyValue[2].trim()),
          listValues: []
        };
        if (current.key) properties.push(current);
        return;
      }

      const listItem = line.match(/^\s*-\s+(.+)$/);
      if (listItem && current) current.listValues.push(normalizePropertyValue(listItem[1].trim()));
    });

    return properties.map((entry) => ({
      key: entry.key,
      value: entry.listValues.length ? entry.listValues.join(', ') : entry.value
    }));
  }

  function renderProperties(properties, renderInline) {
    if (!Array.isArray(properties) || !properties.length) return '';
    const rows = properties.map((entry) => (
      '<div class="markdown-property">' +
      '<dt>' + escapeHtml(entry.key) + '</dt>' +
      '<dd>' + renderInline(entry.value) + '</dd>' +
      '</div>'
    ));
    return '<section class="markdown-properties" aria-label="Properties"><dl>' +
      rows.join('') +
      '</dl></section>';
  }

  function normalizePropertyValue(value) {
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .join(', ');
    }
    return value.replace(/^['"]|['"]$/g, '');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const api = { splitFrontmatter, renderProperties };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusMarkdownProperties = Object.freeze(api);
})();
