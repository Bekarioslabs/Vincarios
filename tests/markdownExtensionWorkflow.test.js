'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultReadService } = require('../src/main/vault/vaultReadService');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');
const { createVaultBackupService } = require('../src/main/vault/vaultBackupService');
const { classifyMarkdownChange } = require('../src/main/vault/vaultChangeService');
const { createVaultIndexFreshnessService } = require('../src/main/vault/vaultIndexFreshnessService');
const { createMetadataIndexer } = require('../src/main/metadata/metadataIndexer');
const { createMetadataIndexStore } = require('../src/main/metadata/metadataIndexStore');
const { createVaultSearchService } = require('../src/main/search/vaultSearchService');
const { createFullTextIndexer } = require('../src/main/search/fullTextIndexer');
const { getSelectionActions } = require('../src/renderer/selectionActions/actionRegistry');
const { buildFileSummaryMessages } = require('../src/renderer/selectionActions/fileSummaryAction');
const { normalizeLinkResults } = require('../src/renderer/markdown/markdownLinkPicker');
const { insertInternalWikilink } = require('../src/renderer/markdown/editorFormatting');
const { resolveMarkdownLink } = require('../src/renderer/markdown/markdownLinkResolver');
const { targetIconFor } = require('../src/renderer/context/mountContextBasket');
const { buildInboxCleanupReport } = require('../src/shared/cleanup/inboxCleanupReport');
const { scoreCandidate } = require('../src/main/embeddings/embeddingCandidateScorer');
const { suggestTags } = require('../src/renderer/selectionActions/tagCandidateAction');

function fixture(t, extension) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-extension-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const targetPath = 'Field Guide' + extension;
  const content = '---\r\ntags: [fixture]\r\n---\r\n# Field Guide\r\n\r\nOriginal text.\r\n';
  fs.writeFileSync(path.join(root, targetPath), content);
  return { root, targetPath, content };
}

for (const extension of ['.md', '.MD', '.markdown', '.MARKDOWN']) {
  test('Markdown writes and backups preserve the supported extension: ' + extension, (t) => {
    const { root, targetPath, content } = fixture(t, extension);
    const reader = createVaultReadService();
    const writer = createVaultWriteService();
    const backup = createVaultBackupService();
    [reader, writer, backup].forEach((service) => assert.equal(service.setRoot(root).ok, true));
    assert.equal(reader.readMarkdown(targetPath).content, content);
    assert.equal(reader.listFolder('').entries[0].kind, 'markdown');
    const copied = backup.backupMarkdownNote(targetPath);
    assert.equal(copied.ok, true, JSON.stringify(copied));
    assert.ok(copied.backupPath.endsWith(extension));
    assert.equal(fs.readFileSync(path.join(root, copied.backupPath), 'utf8'), content);
    const updated = writer.updateNote({ targetPath, currentContent: content, proposedContent: content + 'Added text.\r\n' });
    assert.equal(updated.ok, true, JSON.stringify(updated));
    assert.equal(reader.readMarkdown(targetPath).content, content + 'Added text.\r\n');
    assert.equal(fs.readFileSync(path.join(root, updated.backupPath), 'utf8'), content);
  });

  test('Markdown creation and rename do not add a second extension: ' + extension, (t) => {
    const { root, targetPath } = fixture(t, extension);
    const writer = createVaultWriteService();
    writer.setRoot(root);
    const created = writer.createNote({ title: 'Created' + extension, content: '# Created\n' });
    assert.equal(created.ok, true, JSON.stringify(created));
    assert.equal(created.path, 'Created' + extension);
    const renamed = writer.renameFile({ sourcePath: targetPath, newName: 'Renamed' + extension });
    assert.equal(renamed.ok, true, JSON.stringify(renamed));
    assert.equal(renamed.targetPath, 'Renamed' + extension);
    const implicit = writer.renameFile({ sourcePath: renamed.targetPath, newName: 'Final Name' });
    assert.equal(implicit.ok, true, JSON.stringify(implicit));
    assert.equal(implicit.targetPath, 'Final Name' + extension);
    assert.equal(fs.existsSync(path.join(root, 'Final Name' + extension + '.md')), false);
  });

  test('Markdown selection, summary, context and link picker agree: ' + extension, () => {
    const targetPath = 'Notes/Field Guide' + extension;
    const selection = { kind: 'file', path: targetPath, content: '# Field Guide', readAllowed: true, writeAllowed: true };
    const actions = getSelectionActions(selection);
    assert.equal(actions.length, 5);
    assert.equal(actions.every((action) => action.enabled), true);
    assert.equal(buildFileSummaryMessages(selection).ok, true);
    assert.equal(targetIconFor(selection), 'markdownFile');
    assert.deepEqual(normalizeLinkResults([{ path: targetPath }]), [{ path: targetPath, title: 'Field Guide' }]);
    const inserted = insertInternalWikilink({ source: '', targetPath, selectionStart: 0, selectionEnd: 0 });
    const linkSuffix = extension.toLowerCase() === '.md' ? '' : extension;
    assert.equal(inserted.source, '[[Notes/Field Guide' + linkSuffix + ']]');
    const report = buildInboxCleanupReport({ inboxPath: 'Notes', entries: [{ name: 'Field Guide' + extension, path: targetPath, kind: 'markdown' }] });
    assert.equal(report.totals.markdown, 1);
  });

  test('Markdown changes keep metadata, search and freshness current: ' + extension, async (t) => {
    const { root, targetPath } = fixture(t, extension);
    const indexer = createMetadataIndexer();
    const store = createMetadataIndexStore();
    const freshness = createVaultIndexFreshnessService();
    const search = createVaultSearchService();
    [indexer, store, freshness, search].forEach((service) => assert.equal(service.setRoot(root).ok, true));
    assert.equal((await indexer.rebuildIndex()).ok, true);
    assert.ok(store.load().documents[targetPath]);
    const change = classifyMarkdownChange(targetPath);
    assert.deepEqual(change, { affectsMarkdownIndex: true, markdownPath: targetPath, requiresMetadataRebuild: false });
    fs.writeFileSync(path.join(root, targetPath), '---\ntags: [updated-marker]\n---\n# Updated Guide\n');
    const synced = indexer.syncChangedPaths([targetPath]);
    assert.equal(synced.ok, true, JSON.stringify(synced));
    assert.equal(synced.updatedCount, 1);
    assert.equal(freshness.applyChanges([targetPath]).ok, true);
    assert.equal(freshness.compareDocuments(store.load().documents).current, true);
    assert.deepEqual(search.search({ query: 'updated-marker', scope: 'metadata' }).results.map((entry) => entry.path), [targetPath]);
    fs.unlinkSync(path.join(root, targetPath));
    assert.equal(indexer.syncChangedPaths([targetPath]).removedCount, 1);
    assert.equal(freshness.applyChanges([targetPath]).ok, true);
    assert.equal(freshness.compareDocuments(store.load().documents).current, true);
    assert.equal(search.search({ query: 'updated-marker', scope: 'metadata' }).results.length, 0);
  });
}

test('extensionless relative links reach markdown notes without an index', async (t) => {
  const { root, targetPath, content } = fixture(t, '.markdown');
  const vault = createVaultReadService();
  vault.setRoot(root);
  const result = await resolveMarkdownLink('Field Guide', 'Start.md', { vault });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.path, targetPath);
  assert.equal(result.content, content);
});

test('full-text search indexes markdown notes when explicitly enabled', async (t) => {
  const { root, targetPath } = fixture(t, '.markdown');
  const metadata = createMetadataIndexer();
  const fullText = createFullTextIndexer();
  const search = createVaultSearchService();
  [metadata, fullText, search].forEach((service) => assert.equal(service.setRoot(root).ok, true));
  assert.equal((await metadata.rebuildIndex()).ok, true);
  assert.equal(fullText.setEnabled(true).ok, true);
  assert.equal((await fullText.rebuildIndex()).documentCount, 1);
  assert.deepEqual(search.search({ query: 'original', scope: 'content' }).results.map((entry) => entry.path), [targetPath]);
});

test('Similar Notes filename evidence ignores both Markdown extensions', () => {
  const result = scoreCandidate({ targetRecord: { path: 'Notes/Field Guide.md' }, candidateRecord: { path: 'Notes/Field Guide.markdown' }, embeddingScore: 0.8 });
  assert.equal(result.diagnostics.titleScore, 1);
});

test('standard filename tag hints do not depend on the Markdown extension', () => {
  const standard = suggestTags('02_Projects/Aurora/References.md', 'A short note.', [], 5);
  assert.ok(standard.includes('references'));
  assert.deepEqual(suggestTags('02_Projects/Aurora/References.markdown', 'A short note.', [], 5), standard);
});

for (const currentPath of ['Start.md', 'Elsewhere/Start.md']) {
  test('a selected markdown link keeps its exact target beside an md sibling: ' + currentPath, async (t) => {
    const { root } = fixture(t, '.md');
    fs.mkdirSync(path.join(root, 'Notes'));
    fs.writeFileSync(path.join(root, 'Notes/Guide.md'), '# The other note\n');
    fs.writeFileSync(path.join(root, 'Notes/Guide.markdown'), '# The selected long-extension note\n');
    const vault = createVaultReadService();
    vault.setRoot(root);
    const inserted = insertInternalWikilink({ source: '', targetPath: 'Notes/Guide.markdown', selectionStart: 0, selectionEnd: 0 });
    const target = inserted.source.slice(2, -2);
    const resolved = await resolveMarkdownLink(target, currentPath, { vault });
    assert.equal(resolved.ok, true, JSON.stringify(resolved));
    assert.equal(resolved.path, 'Notes/Guide.markdown');
    assert.equal(resolved.content, '# The selected long-extension note\n');
  });
}

test('an extensionless vault-relative link reaches the root candidate after a relative miss', async (t) => {
  const { root } = fixture(t, '.md');
  fs.mkdirSync(path.join(root, 'Notes'));
  fs.writeFileSync(path.join(root, 'Notes/Guide.markdown'), '# Root candidate\n');
  const vault = createVaultReadService();
  vault.setRoot(root);
  const resolved = await resolveMarkdownLink('Notes/Guide', 'Elsewhere/Start.md', { vault });
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert.equal(resolved.path, 'Notes/Guide.markdown');
});
