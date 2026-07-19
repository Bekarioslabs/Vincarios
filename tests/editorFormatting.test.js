'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { applyEditorFormat, insertInternalWikilink } = require('../src/renderer/markdown/editorFormatting');

function format(source, action, start, end) {
  return applyEditorFormat({ source, action, selectionStart: start, selectionEnd: end });
}

test('editor formatting wraps and unwraps inline Markdown', () => {
  const bold = format('alpha beta', 'bold', 6, 10);
  assert.equal(bold.source, 'alpha **beta**');
  assert.deepEqual([bold.selectionStart, bold.selectionEnd], [8, 12]);

  const unwrapped = format(bold.source, 'bold', 6, 14);
  assert.equal(unwrapped.source, 'alpha beta');
});

test('editor formatting wraps and unwraps standard Markdown strikethrough', () => {
  const struck = format('alpha beta', 'strikethrough', 6, 10);
  assert.equal(struck.source, 'alpha ~~beta~~');
  assert.deepEqual([struck.selectionStart, struck.selectionEnd], [8, 12]);

  const unwrapped = format(struck.source, 'strikethrough', 6, 14);
  assert.equal(unwrapped.source, 'alpha beta');
});

test('editor formatting applies line-based headings and lists', () => {
  const heading = format('First\nSecond', 'heading2', 0, 12);
  assert.equal(heading.source, '## First\n## Second');

  const bullets = format('First\nSecond', 'bulletList', 0, 12);
  assert.equal(bullets.source, '- First\n- Second');

  const tasks = format(bullets.source, 'taskList', 0, bullets.source.length);
  assert.equal(tasks.source, '- [ ] First\n- [ ] Second');

  const ordered = format(tasks.source, 'orderedList', 0, tasks.source.length);
  assert.equal(ordered.source, '1. First\n2. Second');

  const restoredBullets = format(ordered.source, 'bulletList', 0, ordered.source.length);
  assert.equal(restoredBullets.source, '- First\n- Second');

  const removedTasks = format(tasks.source, 'taskList', 0, tasks.source.length);
  assert.equal(removedTasks.source, 'First\nSecond');
});

test('editor formatting inserts Markdown links and safe highlight markup', () => {
  const link = format('Note', 'link', 0, 4);
  assert.equal(link.source, '[Note](url)');
  assert.equal(link.source.slice(link.selectionStart, link.selectionEnd), 'url');

  const highlight = format('Note', 'highlight', 0, 4);
  assert.equal(highlight.source, '<mark style="background:#d3f8b6">Note</mark>');
});
test('editor formatting inserts Obsidian wikilinks from a selected label or an empty cursor', () => {
  const labeled = insertInternalWikilink({
    source: 'Read this note',
    selectionStart: 5,
    selectionEnd: 14,
    targetPath: '03_Knowledge/Project Notes.md'
  });
  assert.equal(labeled.source, 'Read [[03_Knowledge/Project Notes|this note]]');

  const unlabelled = insertInternalWikilink({
    source: 'Read ',
    selectionStart: 5,
    selectionEnd: 5,
    targetPath: '03_Knowledge/Project Notes.md'
  });
  assert.equal(unlabelled.source, 'Read [[03_Knowledge/Project Notes]]');
});
