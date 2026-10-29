(function() {
  'use strict';

  function useObsidianMarkdown(md) {
    const formattingCompat = loadFormattingCompat();
    formattingCompat.useMarkdownFormattingCompat(md);

    md.inline.ruler.before('image', 'obsidian_image_embed', parseImageEmbed);
    md.inline.ruler.before('emphasis', 'obsidian_comment', parseComment);
    md.inline.ruler.before('emphasis', 'obsidian_highlight', parseHighlight);
    md.inline.ruler.before('link', 'obsidian_wikilink', parseWikilink);

    md.renderer.rules.image = renderMarkdownImage;
    md.renderer.rules.obsidian_image_embed = renderImageEmbed;
    md.renderer.rules.obsidian_highlight = renderHighlight;
    md.renderer.rules.obsidian_wikilink = renderWikilink;
    md.renderer.rules.vincarios_task_checkbox = renderTaskCheckbox;

    useSafeLinkTargets(md);
    md.core.ruler.after('inline', 'vincarios_task_lists', transformTaskLists);
  }

  // Silent link-label validation consumes matches without emitting tokens.
  function parseImageEmbed(state, silent) {
    if (!state.src.startsWith('![[', state.pos)) return false;
    const end = state.src.indexOf(']]', state.pos + 3);
    if (end === -1) return false;
    const raw = state.src.slice(state.pos + 3, end);
    const separator = raw.indexOf('|');
    const target = (separator === -1 ? raw : raw.slice(0, separator)).trim();
    const label = (separator === -1 ? '' : raw.slice(separator + 1)).trim();
    if (!target) return false;
    if (!silent) {
      const token = state.push('obsidian_image_embed', 'img', 0);
      token.meta = { target, label };
    }
    state.pos = end + 2;
    return true;
  }

  function parseComment(state) {
    if (!state.src.startsWith('%%', state.pos)) return false;
    const end = state.src.indexOf('%%', state.pos + 2);
    if (end === -1) return false;
    state.pos = end + 2;
    return true;
  }

  function parseHighlight(state, silent) {
    if (!state.src.startsWith('==', state.pos)) return false;
    const end = state.src.indexOf('==', state.pos + 2);
    if (end === -1 || end === state.pos + 2) return false;
    if (!silent) {
      const token = state.push('obsidian_highlight', 'mark', 0);
      token.content = state.src.slice(state.pos + 2, end);
    }
    state.pos = end + 2;
    return true;
  }

  function parseWikilink(state, silent) {
    if (!state.src.startsWith('[[', state.pos)) return false;
    const end = state.src.indexOf(']]', state.pos + 2);
    if (end === -1) return false;
    const raw = state.src.slice(state.pos + 2, end);
    const separator = raw.indexOf('|');
    const target = (separator === -1 ? raw : raw.slice(0, separator)).trim();
    const label = (separator === -1 ? raw : raw.slice(separator + 1)).trim();
    if (!target) return false;
    if (!silent) {
      const token = state.push('obsidian_wikilink', 'span', 0);
      token.meta = { target, label: label || target };
    }
    state.pos = end + 2;
    return true;
  }

  function renderMarkdownImage(tokens, index) {
    const token = tokens[index];
    const target = token.attrGet('src') || '';
    const alt = token.content || token.attrGet('alt') || '';
    return renderSafeImage(target, alt);
  }

  function renderImageEmbed(tokens, index) {
    const meta = tokens[index].meta || {};
    return renderSafeImage(meta.target || '', meta.label || '');
  }

  function renderSafeImage(target, alt) {
    return '<img class="markdown-image-embed" data-image-target="' +
      escapeHtml(String(target || '')) +
      '" alt="' + escapeHtml(String(alt || '')) +
      '" data-image-state="pending">';
  }

  function renderHighlight(tokens, index, options, env, renderer) {
    return '<mark>' + escapeHtml(tokens[index].content) + '</mark>';
  }

  function renderWikilink(tokens, index, options, env, renderer) {
    const meta = tokens[index].meta || {};
    return '<span class="markdown-wikilink" data-link-target="' +
      escapeHtml(String(meta.target || '')) + '">' +
      escapeHtml(String(meta.label || '')) +
      '</span>';
  }

  function useSafeLinkTargets(md) {
    md.renderer.rules.link_open = function(tokens, index, options, env, renderer) {
      const token = tokens[index];
      const target = token.attrGet('href') || '';
      return '<span class="markdown-link" data-link-target="' +
        escapeHtml(target) + '">';
    };
    md.renderer.rules.link_close = function() {
      return '</span>';
    };
  }

  function transformTaskLists(state) {
    state.tokens.forEach((token, index) => {
      if (token.type !== 'inline') return;
      const task = token.content.match(/^\[([ xX])\]\s+/);
      if (!task || !token.children || !token.children.length) return;

      const firstText = token.children.find((child) => child.type === 'text');
      if (!firstText || !firstText.content.startsWith(task[0])) return;
      firstText.content = firstText.content.slice(task[0].length);

      const checkbox = new state.Token('vincarios_task_checkbox', 'input', 0);
      checkbox.meta = { checked: task[1].toLowerCase() === 'x' };
      token.children.unshift(checkbox);

      const listItem = findParentListItem(state.tokens, index);
      if (listItem) listItem.attrJoin('class', 'markdown-task-list-item');
    });
  }

  function findParentListItem(tokens, inlineIndex) {
    for (let index = inlineIndex - 1; index >= 0; index -= 1) {
      if (tokens[index].type === 'list_item_open') return tokens[index];
      if (tokens[index].type === 'list_item_close') return null;
    }
    return null;
  }

  function renderTaskCheckbox(tokens, index) {
    const checked = Boolean(tokens[index].meta && tokens[index].meta.checked);
    return checked
      ? '<input type="checkbox" checked disabled> '
      : '<input type="checkbox" disabled> ';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadFormattingCompat() {
    if (typeof window !== 'undefined' && window.VincariosMarkdownFormattingCompat) {
      return window.VincariosMarkdownFormattingCompat;
    }
    if (typeof require === 'function') return require('./markdownFormattingCompat');
    throw new Error('Markdown formatting compatibility module unavailable.');
  }

  const api = { useObsidianMarkdown };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.VincariosObsidianMarkdownExtension = Object.freeze(api);
})();
