'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');

test('vault write service creates Markdown notes and appends audit entries', () => {
  const root = createTempVault();
  const service = createVaultWriteService();
  assert.equal(service.setRoot(root).ok, true);

  const result = service.createNote({
    targetFolder: '00_Inbox/AI Responses',
    title: 'Saved Answer',
    content: '# Saved Answer\n\nBody.'
  });

  assert.equal(result.ok, true);
  assert.equal(result.path, '00_Inbox/AI Responses/Saved Answer.md');
  assert.equal(fs.readFileSync(path.join(root, '00_Inbox', 'AI Responses', 'Saved Answer.md'), 'utf8'), '# Saved Answer\n\nBody.');

  const audit = readAudit(root);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, 'create_note');
  assert.equal(audit[0].path, '00_Inbox/AI Responses/Saved Answer.md');
  assert.equal(audit[0].result, 'created');
});

test('vault write service refuses to overwrite existing notes', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '00_Inbox'), { recursive: true });
  fs.writeFileSync(path.join(root, '00_Inbox', 'Existing.md'), 'old');
  const service = createVaultWriteService();
  service.setRoot(root);

  const result = service.createNote({
    targetFolder: '00_Inbox',
    title: 'Existing',
    content: 'new'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'file_exists');
  assert.equal(fs.readFileSync(path.join(root, '00_Inbox', 'Existing.md'), 'utf8'), 'old');
});

test('vault write service rejects unsafe or non-markdown create targets', () => {
  const root = createTempVault();
  const service = createVaultWriteService();
  service.setRoot(root);

  assert.equal(service.createNote({ targetFolder: '../outside', title: 'A', content: 'x' }).code, 'traversal_not_allowed');
  assert.equal(service.createNote({ targetFolder: '.obsidian', title: 'A', content: 'x' }).code, 'protected_path');
  assert.equal(service.createNote({ targetFolder: '00_Inbox', title: 'Bad.exe', content: 'x' }).path, '00_Inbox/Bad.exe.md');
});

test('vault write service requires an opened vault', () => {
  const service = createVaultWriteService();
  const result = service.createNote({ targetFolder: '00_Inbox', title: 'A', content: 'x' });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'vault_not_open');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zeus-write-vault-'));
}

function readAudit(root) {
  const text = fs.readFileSync(path.join(root, '.zeus', 'audit.jsonl'), 'utf8').trim();
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}
test('vault write service updates Markdown notes only after backup and content match', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Wissen'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Wissen', 'Topic.md'), '# Topic\n\nOld body.');
  const service = createVaultWriteService({ now: () => new Date('2026-06-24T10:11:12.000Z') });
  service.setRoot(root);

  const result = service.updateNote({
    targetPath: '03_Wissen/Topic.md',
    currentContent: '# Topic\n\nOld body.',
    proposedContent: '# Topic\n\nNew body.'
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'update_note');
  assert.equal(result.path, '03_Wissen/Topic.md');
  assert.equal(result.backupPath, '.zeus/backups/2026-06-24/03_Wissen/Topic.2026-06-24_12-11-12.md');
  assert.equal(fs.readFileSync(path.join(root, '03_Wissen', 'Topic.md'), 'utf8'), '# Topic\n\nNew body.');
  assert.equal(fs.readFileSync(path.join(root, result.backupPath), 'utf8'), '# Topic\n\nOld body.');

  const audit = readAudit(root);
  assert.equal(audit[0].action, 'backup_note');
  assert.equal(audit[1].action, 'update_note');
  assert.equal(audit[1].path, '03_Wissen/Topic.md');
  assert.equal(audit[1].backupPath, result.backupPath);
});

test('vault write service rejects stale update proposals before backup or write', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Wissen'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Wissen', 'Topic.md'), 'Changed elsewhere');
  const service = createVaultWriteService();
  service.setRoot(root);

  const result = service.updateNote({
    targetPath: '03_Wissen/Topic.md',
    currentContent: 'Old content',
    proposedContent: 'New content'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'stale_content');
  assert.equal(fs.readFileSync(path.join(root, '03_Wissen', 'Topic.md'), 'utf8'), 'Changed elsewhere');
  assert.equal(fs.existsSync(path.join(root, '.zeus', 'backups')), false);
});
