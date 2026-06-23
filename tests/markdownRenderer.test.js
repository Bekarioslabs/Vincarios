'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderMarkdown } = require('../src/renderer/markdown/markdownRenderer');

test('renders YAML frontmatter as visible properties block', () => {
  const html = renderMarkdown('---\ntags: [project, draft]\nstatus: active\n---\n\n# StarLu');

  assert.match(html, /class="markdown-properties"/);
  assert.match(html, /<dt>tags<\/dt>/);
  assert.match(html, /project, draft/);
  assert.match(html, /<dt>status<\/dt>/);
  assert.match(html, /active/);
  assert.doesNotMatch(html, /---/);
});

test('renders common Markdown and Obsidian-style wikilinks safely', () => {
  const html = renderMarkdown('# Title\n\nThis is **bold**, *italic*, `code`, and [[Project Home|home]].');

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /class="markdown-wikilink"/);
  assert.match(html, /data-link-target="Project Home"/);
  assert.match(html, />home<\/span>/);
});

test('escapes unsafe HTML instead of executing it', () => {
  const html = renderMarkdown('# Safe\n\n<script>alert(1)</script>\n[bad](javascript:alert(1))');

  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /href="javascript:/i);
});

test('renders fenced code blocks without interpreting Markdown inside', () => {
  const html = renderMarkdown('```js\nconst value = "**no bold**";\n```');

  assert.match(html, /<pre><code class="language-js">/);
  assert.match(html, /\*\*no bold\*\*/);
  assert.doesNotMatch(html, /<strong>no bold<\/strong>/);
});