(function() {
  'use strict';

  function renderMarkdown(source) {
    const parsed = splitFrontmatter(String(source || ''));
    const parts = [];

    if (parsed.properties.length) parts.push(renderProperties(parsed.properties));
    parts.push(renderMarkdownBody(parsed.body));

    return parts.filter(Boolean).join('\n');
  }

  function splitFrontmatter(source) {
    const normalized = source.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('---\n')) return { properties: [], body: normalized };

    const endIndex = normalized.indexOf('\n---', 4);
    if (endIndex === -1) return { properties: [], body: normalized };

    const afterMarker = normalized.slice(endIndex + 4);
    const body = afterMarker.startsWith('\n') ? afterMarker.slice(1) : afterMarker;
    return {
      properties: parseFrontmatter(normalized.slice(4, endIndex)),
      body
    };
  }

  function parseFrontmatter(frontmatter) {
    return frontmatter
      .split('\n')
      .map((line) => line.match(/^([^:#][^:]*):\s*(.*)$/))
      .filter(Boolean)
      .map((match) => ({ key: match[1].trim(), value: normalizePropertyValue(match[2].trim()) }))
      .filter((entry) => entry.key);
  }

  function normalizePropertyValue(value) {
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean).join(', ');
    }
    return value.replace(/^['"]|['"]$/g, '');
  }

  function renderProperties(properties) {
    const rows = properties.map((entry) => (
      '<div class="markdown-property">' +
      '<dt>' + escapeHtml(entry.key) + '</dt>' +
      '<dd>' + renderInline(entry.value) + '</dd>' +
      '</div>'
    ));

    return '<section class="markdown-properties" aria-label="Properties"><dl>' + rows.join('') + '</dl></section>';
  }

  function renderMarkdownBody(body) {
    const lines = String(body || '').replace(/\r\n/g, '\n').split('\n');
    const output = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }

      const fence = line.match(/^```([^`]*)\s*$/);
      if (fence) {
        const codeLines = [];
        i += 1;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) {
          codeLines.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        const language = fence[1].trim();
        const className = language ? ' class="language-' + escapeAttribute(language) + '"' : '';
        output.push('<pre><code' + className + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        continue;
      }

      if (isTableStart(lines, i)) {
        const table = collectTable(lines, i);
        output.push(renderTable(table.rows));
        i = table.nextIndex;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        output.push('<h' + level + '>' + renderInline(heading[2].trim()) + '</h' + level + '>');
        i += 1;
        continue;
      }

      if (/^\s*---+\s*$/.test(line)) {
        output.push('<hr>');
        i += 1;
        continue;
      }

      if (/^>\s?/.test(line)) {
        const quotes = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quotes.push(lines[i].replace(/^>\s?/, ''));
          i += 1;
        }
        output.push('<blockquote>' + renderParagraphs(quotes.join('\n')) + '</blockquote>');
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
          i += 1;
        }
        output.push('<ul>' + items.map((item) => '<li>' + renderInline(item) + '</li>').join('') + '</ul>');
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
          i += 1;
        }
        output.push('<ol>' + items.map((item) => '<li>' + renderInline(item) + '</li>').join('') + '</ol>');
        continue;
      }

      const paragraph = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
        paragraph.push(lines[i]);
        i += 1;
      }
      output.push(renderParagraphs(paragraph.join('\n')));
    }

    return output.join('\n');
  }

  function isBlockStart(lines, index) {
    const line = lines[index] || '';
    return /^```/.test(line) ||
      isTableStart(lines, index) ||
      /^(#{1,6})\s+/.test(line) ||
      /^\s*---+\s*$/.test(line) ||
      /^>\s?/.test(line) ||
      /^\s*[-*+]\s+/.test(line) ||
      /^\s*\d+\.\s+/.test(line);
  }

  function renderParagraphs(text) {
    return '<p>' + String(text).split('\n').map(renderInline).join('<br>') + '</p>';
  }

  function isTableStart(lines, index) {
    return /\|/.test(lines[index] || '') && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || '');
  }

  function collectTable(lines, index) {
    const rows = [splitTableRow(lines[index])];
    let cursor = index + 2;
    while (cursor < lines.length && /\|/.test(lines[cursor] || '') && lines[cursor].trim()) {
      rows.push(splitTableRow(lines[cursor]));
      cursor += 1;
    }
    return { rows, nextIndex: cursor };
  }

  function splitTableRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  }

  function renderTable(rows) {
    const header = rows[0] || [];
    const body = rows.slice(1);
    return '<table><thead><tr>' +
      header.map((cell) => '<th>' + renderInline(cell) + '</th>').join('') +
      '</tr></thead><tbody>' +
      body.map((row) => '<tr>' + row.map((cell) => '<td>' + renderInline(cell) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table>';
  }

  function renderInline(value) {
    const codeTokens = [];
    let text = String(value || '').replace(/`([^`]+)`/g, (_, code) => {
      const token = '@@ZEUS_CODE_' + codeTokens.length + '@@';
      codeTokens.push('<code>' + escapeHtml(code) + '</code>');
      return token;
    });

    text = escapeHtml(text);
    text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
      const cleanTarget = decodeBasicEntities(target.trim());
      const cleanLabel = decodeBasicEntities((label || target).trim());
      return '<span class="markdown-wikilink" data-link-target="' + escapeAttribute(cleanTarget) + '">' + escapeHtml(cleanLabel) + '</span>';
    });
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, target) => {
      const cleanTarget = decodeBasicEntities(target.trim());
      return '<span class="markdown-link" data-link-target="' + escapeAttribute(cleanTarget) + '">' + renderInline(decodeBasicEntities(label)) + '</span>';
    });
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    codeTokens.forEach((html, index) => {
      text = text.replace('@@ZEUS_CODE_' + index + '@@', html);
    });
    return text;
  }

  function decodeBasicEntities(value) {
    return String(value || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  const api = { renderMarkdown, splitFrontmatter };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.ZeusMarkdownRenderer = Object.freeze(api);
})();