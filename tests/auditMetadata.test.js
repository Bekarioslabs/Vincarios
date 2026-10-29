'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');
const { createReviewedTemplateService } = require('../src/main/templates/reviewedTemplateService');

function setup(t, options) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-audit-metadata-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const service = createVaultWriteService(options);
  assert.equal(service.setRoot(root).ok, true);
  const audit = () => fs.readFileSync(path.join(root, '.vincarios/audit.jsonl'), 'utf8')
    .trim().split('\n').filter(Boolean).map(JSON.parse);
  return { root, service, audit };
}

function snapshot(bytes) {
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

test('create audits UTF-8 bytes and absence rather than trusting supplied hashes or extra content', (t) => {
  const { root, service, audit } = setup(t);
  const content = '# Caf\u00e9\n';
  assert.equal(service.createNote({ title: 'New', content, auditMetadata: {
    origin: 'save_assistant_response', provider: 'lm-studio', model: 'google/gemma-4-12b-qat',
    integrity: { before: 'forged', after: 'forged' }, prompt: 'PRIVATE PROMPT', note: content
  } }).ok, true);
  const entry = audit()[0];
  assert.deepEqual(entry.integrity, { before: null, after: snapshot(fs.readFileSync(path.join(root, 'New.md'))) });
  assert.deepEqual(entry.provenance, {
    origin: 'save_assistant_response', provider: 'lm-studio', model: 'google/gemma-4-12b-qat'
  });
  assert.equal(JSON.stringify(entry).includes('PRIVATE PROMPT'), false);
  assert.equal(JSON.stringify(entry).includes('Caf'), false);
});

test('updates audit original bytes, preserved CRLF output and the exact backup without note bodies', (t) => {
  const { root, service, audit } = setup(t);
  const before = Buffer.from('# Caf\u00e9\r\nOld\r\n');
  fs.writeFileSync(path.join(root, 'Topic.md'), before);
  assert.equal(service.updateNote({ targetPath: 'Topic.md', currentContent: before.toString('utf8'),
    proposedContent: '# Caf\u00e9\nNew\n', auditMetadata: { origin: 'source_editor' }
  }).ok, true);
  const entries = audit();
  const after = fs.readFileSync(path.join(root, 'Topic.md'));
  assert.equal(after.toString('utf8'), '# Caf\u00e9\r\nNew\r\n');
  assert.deepEqual(entries[1].integrity, { before: snapshot(before), after: snapshot(after) });
  assert.deepEqual(entries[1].provenance, { origin: 'source_editor', provider: null, model: null });
  assert.deepEqual(entries[0].integrity, { before: null, after: snapshot(before) });
  assert.equal(JSON.stringify(entries).includes('Old'), false);
});

test('rename audits unchanged raw bytes including non-UTF-8 sequences', (t) => {
  const { root, service, audit } = setup(t);
  const bytes = Buffer.from([35, 32, 255, 13, 10]);
  fs.writeFileSync(path.join(root, 'Before.md'), bytes);
  assert.equal(service.renameFile({ sourcePath: 'Before.md', newName: 'After' }).ok, true);
  const entry = audit()[1];
  assert.deepEqual(entry.integrity, { before: snapshot(bytes), after: snapshot(bytes) });
  assert.deepEqual(fs.readFileSync(path.join(root, 'After.md')), bytes);
});

test('unknown or invalid provenance is omitted rather than inferring the currently active provider', (t) => {
  const { service, audit } = setup(t);
  for (const [title, auditMetadata] of [
    ['Missing', undefined],
    ['Invalid', { origin: 'SECRET BODY', provider: 'https://private.invalid', model: 'SECRET\nBODY' }],
    ['Oversized', { origin: 'ai_update', provider: 'ollama', model: 'm'.repeat(161) }],
    ['Path', { origin: 'ai_update', provider: 'lm-studio', model: 'C:/Users/private/model' }]
  ]) {
    assert.equal(service.createNote({ title, content: '# Note', auditMetadata }).ok, true);
  }
  assert.deepEqual(audit().map((entry) => entry.provenance), [
    { origin: 'unknown', provider: null, model: null },
    { origin: 'unknown', provider: null, model: null },
    { origin: 'ai_update', provider: 'ollama', model: null },
    { origin: 'ai_update', provider: 'lm-studio', model: null }
  ]);
});

test('metadata does not authorize a stale update or bypass path protection', (t) => {
  const { root, service } = setup(t);
  fs.writeFileSync(path.join(root, 'Note.md'), 'external change');
  const auditMetadata = { origin: 'ai_update', provider: 'ollama', model: 'gemma:12b', reviewed: true };
  assert.equal(service.updateNote({ targetPath: 'Note.md', currentContent: 'old', proposedContent: 'new', auditMetadata }).code, 'stale_content');
  assert.equal(service.createNote({ targetFolder: '.obsidian', title: 'No', content: 'new', auditMetadata }).ok, false);
  assert.equal(fs.existsSync(path.join(root, '.vincarios/audit.jsonl')), false);
});

test('template creation audits every created file independently without contents', (t) => {
  const { root, audit } = setup(t);
  const service = createReviewedTemplateService();
  service.setRoot(root);
  const files = [
    { path: 'Atlas/Atlas.md', content: '# Atlas\r\n' },
    { path: 'Atlas/Research.md', content: '# Research\n' }
  ];
  assert.equal(service.createFromReview({ targetPath: 'Atlas', files, originAction: 'create_from_preset' }).ok, true);
  const entry = audit()[0];
  assert.equal(entry.provenance.origin, 'create_from_preset');
  assert.deepEqual(entry.fileIntegrity, files.map((file) => ({
    path: file.path, before: null, after: snapshot(fs.readFileSync(path.join(root, file.path)))
  })));
  assert.equal(JSON.stringify(entry).includes('# Research'), false);
});

test('audit failure restores the exact original bytes rather than a UTF-8 re-encoding', (t) => {
  const fileSystem = Object.create(fs);
  fileSystem.appendFileSync = (file, data, encoding) => {
    if (JSON.parse(data).action === 'update_note') throw new Error('Audit unavailable');
    return fs.appendFileSync(file, data, encoding);
  };
  const { root, service, audit } = setup(t, { fs: fileSystem });
  const bytes = Buffer.from([35, 32, 255, 13, 10]);
  fs.writeFileSync(path.join(root, 'Note.md'), bytes);
  const result = service.updateNote({ targetPath: 'Note.md', currentContent: bytes.toString('utf8'), proposedContent: '# New\n' });
  assert.equal(result.code, 'audit_failed');
  assert.deepEqual(fs.readFileSync(path.join(root, 'Note.md')), bytes);
  assert.deepEqual(audit().map((entry) => entry.action), ['backup_note']);
});

test('failed rename hash read rolls back only after the rename actually happened', (t) => {
  for (const afterRename of [false, true]) {
    const fileSystem = Object.create(fs);
    const { root, service, audit } = setup(t, { fs: fileSystem });
    const source = path.join(root, 'Before.md');
    const target = path.join(root, 'After.md');
    fs.writeFileSync(source, '# Keep');
    fileSystem.readFileSync = (file, ...args) => {
      if (file === (afterRename ? target : source)) throw new Error('Read denied');
      return fs.readFileSync(file, ...args);
    };
    const result = service.renameFile({ sourcePath: 'Before.md', newName: 'After' });
    assert.equal(result.code, 'rename_failed');
    assert.equal(result.rolledBack, true);
    assert.equal(fs.readFileSync(source, 'utf8'), '# Keep');
    assert.equal(fs.existsSync(target), false);
    assert.deepEqual(audit().map((entry) => entry.action), ['backup_note']);
  }
});

test('backup hash read failure removes only the new backup and stops the update', (t) => {
  const fileSystem = Object.create(fs);
  const { root, service, audit } = setup(t, { fs: fileSystem });
  fs.writeFileSync(path.join(root, 'Note.md'), '# Keep');
  fileSystem.readFileSync = (file, ...args) => {
    if (String(file).includes(path.join('.vincarios', 'backups'))) throw new Error('Read denied');
    return fs.readFileSync(file, ...args);
  };
  assert.equal(service.updateNote({ targetPath: 'Note.md', currentContent: '# Keep', proposedContent: '# New' }).code, 'backup_failed');
  assert.equal(fs.readFileSync(path.join(root, 'Note.md'), 'utf8'), '# Keep');
  assert.deepEqual(audit(), []);
  const backupRoot = path.join(root, '.vincarios', 'backups');
  const files = fs.readdirSync(backupRoot, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile());
  assert.equal(files.length, 0);
});
