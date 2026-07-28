(function() {
  'use strict';

  let engine = null;

  function renderBody(source) {
    return getEngine().render(String(source || ''));
  }

  function renderInline(source) {
    return getEngine().renderInline(String(source || ''));
  }

  function getEngine() {
    if (engine) return engine;
    const MarkdownIt = loadMarkdownIt();
    const extension = loadObsidianExtension();
    engine = new MarkdownIt({
      html: false,
      breaks: false,
      linkify: false,
      typographer: false
    });
    extension.useObsidianMarkdown(engine);
    return engine;
  }

  function loadMarkdownIt() {
    if (typeof window !== 'undefined' && window.markdownit) return window.markdownit;
    if (typeof require === 'function') return require('markdown-it');
    throw new Error('Markdown engine unavailable.');
  }

  function loadObsidianExtension() {
    if (typeof window !== 'undefined' && window.VincariosObsidianMarkdownExtension) {
      return window.VincariosObsidianMarkdownExtension;
    }
    if (typeof require === 'function') return require('./obsidianMarkdownExtension');
    throw new Error('Obsidian Markdown extension unavailable.');
  }

  const api = { renderBody, renderInline };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosMarkdownEngine = Object.freeze(api);
})();
