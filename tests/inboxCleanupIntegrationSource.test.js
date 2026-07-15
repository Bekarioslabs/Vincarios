const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const shellSource = fs.readFileSync(path.join(root, 'src/renderer/shell/mountShell.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(root, 'src/renderer/bootstrap.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('inbox review is a real navigation workflow, not a disabled placeholder', () => {
  assert.match(shellSource, /data-inbox-review/);
  assert.doesNotMatch(shellSource, /data-future-slot="inbox-review" disabled/);
  assert.match(shellSource, /VitruviosInboxCleanup\.mountInboxCleanup/);
});

test('inbox cleanup renderer and shared report are loaded before shell bootstrap', () => {
  assert.match(bootstrapSource, /VitruviosInboxCleanupReport/);
  assert.match(bootstrapSource, /VitruviosInboxCleanup/);
  assert.ok(htmlSource.indexOf('src/shared/cleanup/inboxCleanupReport.js') < htmlSource.indexOf('src/renderer/cleanup/mountInboxCleanup.js'));
  assert.ok(htmlSource.indexOf('src/renderer/cleanup/mountInboxCleanup.js') < htmlSource.indexOf('src/renderer/shell/mountShell.js'));
});

test('inbox cleanup lists direct child folders without recursive tree scanning', () => {
  const cleanupSource = fs.readFileSync(path.join(root, 'src/renderer/cleanup/mountInboxCleanup.js'), 'utf8');

  assert.match(cleanupSource, /collectDirectChildFolderEntries/);
  assert.match(cleanupSource, /childEntriesByFolder/);
  assert.doesNotMatch(cleanupSource, /listFolderTree/);
});
test('inbox cleanup offers an explicit nested folder scan follow-up', () => {
  const cleanupSource = fs.readFileSync(path.join(root, 'src/renderer/cleanup/mountInboxCleanup.js'), 'utf8');

  assert.match(cleanupSource, /Scan nested folders/);
  assert.match(cleanupSource, /collectNestedFolderEntries/);
  assert.match(cleanupSource, /mode: 'nested'/);
});
test('inbox cleanup reports use a dedicated Ember heading presentation', () => {
  const cleanupSource = fs.readFileSync(path.join(root, 'src/renderer/cleanup/mountInboxCleanup.js'), 'utf8');
  const chatSource = fs.readFileSync(path.join(root, 'src/renderer/chat/mountChat.js'), 'utf8');

  assert.match(cleanupSource, /presentation: 'inbox-cleanup'/);
  assert.match(chatSource, /chat-message-inbox-cleanup/);
});