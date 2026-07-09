'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
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
  const html = renderMarkdown('# Title\n\nThis is **bold**, *italic*, `code`, [Google](https://www.google.com), and [[Project Home|home]].');

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<code>code<\/code>/);
  assert.match(html, /class="markdown-link"/);
  assert.match(html, /data-link-target="https:\/\/www\.google\.com"/);
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

test('renders tilde code fences without interpreting Markdown inside', () => {
  const html = renderMarkdown('~~~md\n**no bold**\n~~~');

  assert.match(html, /<pre><code class="language-md">/);
  assert.match(html, /\*\*no bold\*\*/);
  assert.doesNotMatch(html, /<strong>no bold<\/strong>/);
});

test('renders Obsidian-style four-backtick code fences without hanging', () => {
  const script = [
    "const { renderMarkdown } = require('./src/renderer/markdown/markdownRenderer');",
    "const html = renderMarkdown('````markdown\\n# AI Briefing\\n````');",
    "console.log(html);"
  ].join(' ');
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: pathToProjectRoot(),
    encoding: 'utf8',
    timeout: 1000
  });

  assert.notEqual(result.error && result.error.code, 'ETIMEDOUT');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<pre><code class="language-markdown">/);
  assert.match(result.stdout, /# AI Briefing/);
});

function pathToProjectRoot() {
  return require('node:path').join(__dirname, '..');
}

test('renders YAML block list frontmatter values as properties', () => {
  const html = renderMarkdown('---\ntags:\n  - marvel\n  - iron-man\n  - tony-stark\nstatus: active\n---\n\n# Tony Stark');

  assert.match(html, /<dt>tags<\/dt>/);
  assert.match(html, /marvel, iron-man, tony-stark/);
  assert.match(html, /<dt>status<\/dt>/);
  assert.match(html, /active/);
});

test('renders Markdown task list checkboxes as disabled checkbox controls', () => {
  const html = renderMarkdown('- [ ] Draft outline\n- [x] Review done');

  assert.match(html, /<input type="checkbox" disabled>/);
  assert.match(html, /<input type="checkbox" checked disabled>/);
  assert.match(html, /Draft outline/);
  assert.match(html, /Review done/);
});
test('renders soft line breaks as one paragraph without forced br elements', () => {
  const html = renderMarkdown('Soft\nline break.');

  assert.match(html, /<p>Soft\nline break\.<\/p>/);
  assert.doesNotMatch(html, /<br>/);
});

test('renders CommonMark emphasis variants and strikethrough', () => {
  const html = renderMarkdown('This is __bold__, _italic_, and ~~removed~~.');

  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /<em>italic<\/em>/);
  assert.match(html, /<s>removed<\/s>/);
});

test('renders Obsidian highlights and hides Obsidian comments', () => {
  const html = renderMarkdown('Visible ==highlight== and %%private comment%% text.');

  assert.match(html, /<mark>highlight<\/mark>/);
  assert.doesNotMatch(html, /private comment/);
  assert.match(html, /Visible/);
});

test('renders nested lists as nested list structures', () => {
  const html = renderMarkdown('- Parent\n  - Child\n- Sibling');

  assert.match(html, /<li>Parent\s*<ul>/);
  assert.match(html, /<li>Child<\/li>/);
  assert.match(html, /<li>Sibling<\/li>/);
});
test('renders Markdown and Obsidian image embeds as safe preview placeholders', () => {
  const html = renderMarkdown('![Hero](assets/hero.png)\n\n![[assets/portrait.jpg|Portrait]]');

  assert.match(html, /class="markdown-image-embed"/);
  assert.match(html, /data-image-target="assets\/hero\.png"/);
  assert.match(html, /alt="Hero"/);
  assert.match(html, /data-image-target="assets\/portrait\.jpg"/);
  assert.match(html, /alt="Portrait"/);
  assert.doesNotMatch(html, /src="assets\/hero\.png"/);
});
