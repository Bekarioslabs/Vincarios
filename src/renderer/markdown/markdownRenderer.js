(function() {
  'use strict';

  const engine = loadMarkdownEngine();
  const properties = loadMarkdownProperties();

  function renderMarkdown(source) {
    const parsed = properties.splitFrontmatter(String(source || ''));
    const output = [];
    const propertyHtml = properties.renderProperties(parsed.properties, engine.renderInline);
    if (propertyHtml) output.push(propertyHtml);
    const bodyHtml = engine.renderBody(parsed.body);
    if (bodyHtml) output.push(bodyHtml);
    return output.join('\n');
  }

  function splitFrontmatter(source) {
    return properties.splitFrontmatter(source);
  }

  function loadMarkdownEngine() {
    if (typeof window !== 'undefined' && window.VitruviosMarkdownEngine) return window.VitruviosMarkdownEngine;
    if (typeof require === 'function') return require('./markdownEngine');
    throw new Error('Markdown engine unavailable.');
  }

  function loadMarkdownProperties() {
    if (typeof window !== 'undefined' && window.VitruviosMarkdownProperties) return window.VitruviosMarkdownProperties;
    if (typeof require === 'function') return require('./markdownProperties');
    throw new Error('Markdown properties unavailable.');
  }

  const api = { renderMarkdown, splitFrontmatter };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VitruviosMarkdownRenderer = Object.freeze(api);
})();