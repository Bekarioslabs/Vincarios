'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultBackupService } = require('../src/main/vault/vaultBackupService');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');

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

test('two updates with an identical clock preserve both earlier note versions', () => {
  const root = createTempVault();
  const note = path.join(root, 'Topic.md');
  fs.writeFileSync(note, 'first version');
  const service = createVaultWriteService({ now: () => new Date('2026-06-24T10:11:12.000Z') });
  service.setRoot(root);

  const first = service.updateNote({ targetPath: 'Topic.md', currentContent: 'first version', proposedContent: 'second version' });
  const second = service.updateNote({ targetPath: 'Topic.md', currentContent: 'second version', proposedContent: 'third version' });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.backupPath, second.backupPath);
  assert.equal(fs.readFileSync(path.join(root, first.backupPath), 'utf8'), 'first version');
  assert.equal(fs.readFileSync(path.join(root, second.backupPath), 'utf8'), 'second version');
  assert.equal(fs.readFileSync(note, 'utf8'), 'third version');
  const backups = readAudit(root).filter((entry) => entry.action === 'backup_note');
  assert.deepEqual(backups.map((entry) => entry.backupPath), [first.backupPath, second.backupPath]);
});

test('backup collision retries are bounded and never remove an existing copy', () => {
  const root = createTempVault();
  fs.writeFileSync(path.join(root, 'Topic.md'), 'current');
  let attempts = 0;
  const service = createVaultBackupService({ fs: new Proxy(fs, {
    get(target, property) {
      if (property !== 'copyFileSync') return target[property];
      return (_source, destination, flags) => {
        attempts += 1;
        assert.ok(attempts <= 100, 'collision retries must terminate');
        assert.equal(flags, fs.constants.COPYFILE_EXCL);
        fs.writeFileSync(destination, 'earlier backup');
        throw Object.assign(new Error('Destination exists'), { code: 'EEXIST' });
      };
    }
  }) });
  service.setRoot(root);

  const result = service.backupMarkdownNote('Topic.md');

  assert.equal(result.code, 'backup_failed');
  assert.equal(attempts, 100);
  const backups = fs.readdirSync(path.join(root, '.vincarios', 'backups'), { recursive: true }).filter((name) => name.endsWith('.md'));
  assert.equal(backups.length, attempts);
  backups.forEach((name) => assert.equal(fs.readFileSync(path.join(root, '.vincarios', 'backups', name), 'utf8'), 'earlier backup'));
  assert.equal(readAudit(root).length, 0);
});

test('backup permission failure neither retries nor removes an unowned destination', () => {
  const root = createTempVault();
  fs.writeFileSync(path.join(root, 'Topic.md'), 'current');
  let destination;
  let attempts = 0;
  const service = createVaultBackupService({ fs: new Proxy(fs, {
    get(target, property) {
      if (property !== 'copyFileSync') return target[property];
      return (_source, targetPath) => {
        attempts += 1;
        destination = targetPath;
        fs.writeFileSync(destination, 'unowned copy');
        throw Object.assign(new Error('Access denied'), { code: 'EACCES' });
      };
    }
  }) });
  service.setRoot(root);

  const result = service.backupMarkdownNote('Topic.md');

  assert.equal(result.code, 'backup_failed');
  assert.equal(attempts, 1);
  assert.equal(fs.readFileSync(destination, 'utf8'), 'unowned copy');
  assert.equal(fs.readFileSync(path.join(root, 'Topic.md'), 'utf8'), 'current');
});

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-backup-vault-'));
}

function readAudit(root) {
  const text = fs.readFileSync(path.join(root, '.vincarios', 'audit.jsonl'), 'utf8').trim();
  return text ? text.split(/\r?\n/).map((line) => JSON.parse(line)) : [];
}
