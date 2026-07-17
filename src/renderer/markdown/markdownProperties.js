(function() {
  'use strict';

  function splitFrontmatter(source) {
    const parsed = getFrontmatterContract().readFrontmatter(source);
    return {
      properties: parsed.properties,
      body: parsed.body,
      frontmatterError: parsed.ok ? null : {
        code: parsed.code,
        message: parsed.message
      }
    };
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

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getFrontmatterContract() {
    if (typeof window !== 'undefined' && window.VitruviosFrontmatterContract) return window.VitruviosFrontmatterContract;
    if (typeof module !== 'undefined' && module.exports) return require('../../shared/metadata/frontmatterContract');
    throw new Error('Frontmatter contract unavailable.');
  }

  const api = { splitFrontmatter, renderProperties };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownProperties = Object.freeze(api);
})();
