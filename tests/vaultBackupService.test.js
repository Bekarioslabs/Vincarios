'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultBackupService } = require('../src/main/vault/vaultBackupService');

test('vault backup service copies an existing Markdown note before risky writes', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Wissen'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Wissen', 'Topic.md'), '# Topic\n\nOld body.');

  const service = createVaultBackupService({ now: () => new Date('2026-06-24T10:11:12.000Z') });
  assert.equal(service.setRoot(root).ok, true);

  const result = service.backupMarkdownNote('03_Wissen/Topic.md', { action: 'update_note' });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'backup_note');
  assert.equal(result.sourcePath, '03_Wissen/Topic.md');
  assert.equal(result.backupPath, '.vincarios/backups/2026-06-24/03_Wissen/Topic.2026-06-24_10-11-12.md');
  assert.equal(fs.readFileSync(path.join(root, result.backupPath), 'utf8'), '# Topic\n\nOld body.');
  assert.equal(fs.readFileSync(path.join(root, '03_Wissen', 'Topic.md'), 'utf8'), '# Topic\n\nOld body.');

  const audit = readAudit(root);
  assert.equal(audit[0].action, 'backup_note');
  assert.equal(audit[0].sourcePath, '03_Wissen/Topic.md');
  assert.equal(audit[0].backupPath, result.backupPath);
  assert.equal(audit[0].reason, 'update_note');
});

test('vault backup service rejects unsafe, missing, and non-markdown targets', () => {
  const root = createTempVault();
  fs.writeFileSync(path.join(root, 'Image.png'), 'not markdown');
  const service = createVaultBackupService();
  service.setRoot(root);

  assert.equal(service.backupMarkdownNote('../outside.md').code, 'traversal_not_allowed');
  assert.equal(service.backupMarkdownNote('.obsidian/config.md').code, 'protected_path');
  assert.equal(service.backupMarkdownNote('Missing.md').code, 'file_not_found');
  assert.equal(service.backupMarkdownNote('Image.png').code, 'not_markdown');
});

test('vault backup service requires an opened vault', () => {
  const service = createVaultBackupService();
  const result = service.backupMarkdownNote('Note.md');

  assert.equal(result.ok, false);
  assert.equal(result.code, 'vault_not_open');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-backup-vault-'));
}

function readAudit(root) {
  const text = fs.readFileSync(path.join(root, '.vincarios', 'audit.jsonl'), 'utf8').trim();
  return text.split(/\r?\n/).map((line) => JSON.parse(line));
}
