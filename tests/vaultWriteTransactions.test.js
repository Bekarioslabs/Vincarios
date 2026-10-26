'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultBackupService } = require('../src/main/vault/vaultBackupService');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');

test('create note rolls the file back when its audit entry cannot be written', () => {
  const root = createTempVault();
  const service = createVaultWriteService({ fs: createAuditFailingFileSystem('create_note') });
  assert.equal(service.setRoot(root).ok, true);

  const result = service.createNote({
    targetFolder: '00_Inbox',
    title: 'Rolled Back',
    content: '# Rolled Back'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'audit_failed');
  assert.equal(fs.existsSync(path.join(root, '00_Inbox', 'Rolled Back.md')), false);
});

test('update note restores original content when the update audit entry fails', () => {
  const root = createTempVault();
  const notePath = path.join(root, '03_Knowledge', 'Topic.md');
  fs.mkdirSync(path.dirname(notePath), { recursive: true });
  fs.writeFileSync(notePath, 'old');
  const service = createVaultWriteService({
    fs: createAuditFailingFileSystem('update_note'),
    now: () => new Date('2026-07-23T10:00:00.000Z')
  });
  assert.equal(service.setRoot(root).ok, true);

  const result = service.updateNote({
    targetPath: '03_Knowledge/Topic.md',
    currentContent: 'old',
    proposedContent: 'new'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'audit_failed');
  assert.equal(fs.readFileSync(notePath, 'utf8'), 'old');
  assert.equal(fs.existsSync(path.join(
    root,
    '.vincarios',
    'backups',
    '2026-07-23',
    '03_Knowledge',
    'Topic.2026-07-23_10-00-00.md'
  )), true);
});

test('rename creates a backup and restores the source name when its audit fails', () => {
  const root = createTempVault();
  const sourcePath = path.join(root, '03_Knowledge', 'Old.md');
  const targetPath = path.join(root, '03_Knowledge', 'New.md');
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  fs.writeFileSync(sourcePath, 'old');
  const service = createVaultWriteService({
    fs: createAuditFailingFileSystem('rename_file'),
    now: () => new Date('2026-07-23T10:00:00.000Z')
  });
  assert.equal(service.setRoot(root).ok, true);

  const result = service.renameFile({
    sourcePath: '03_Knowledge/Old.md',
    newName: 'New'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'audit_failed');
  assert.equal(fs.readFileSync(sourcePath, 'utf8'), 'old');
  assert.equal(fs.existsSync(targetPath), false);
  assert.equal(fs.existsSync(path.join(
    root,
    '.vincarios',
    'backups',
    '2026-07-23',
    '03_Knowledge',
    'Old.2026-07-23_10-00-00.md'
  )), true);
});

test('backup service uses its injected filesystem and removes unaudited backup copies', () => {
  const root = createTempVault();
  const notePath = path.join(root, '03_Knowledge', 'Topic.md');
  fs.mkdirSync(path.dirname(notePath), { recursive: true });
  fs.writeFileSync(notePath, 'old');
  const service = createVaultBackupService({
    fs: createAuditFailingFileSystem('backup_note'),
    now: () => new Date('2026-07-23T10:00:00.000Z')
  });
  assert.equal(service.setRoot(root).ok, true);

  const result = service.backupMarkdownNote('03_Knowledge/Topic.md', {
    action: 'update_note'
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'audit_failed');
  assert.equal(fs.existsSync(path.join(
    root,
    '.vincarios',
    'backups',
    '2026-07-23',
    '03_Knowledge',
    'Topic.2026-07-23_10-00-00.md'
  )), false);
});

test('failed backup audit after a collision removes only the newly created copy', () => {
  const root = createTempVault();
  const note = path.join(root, 'Topic.md');
  fs.writeFileSync(note, 'first version');
  const now = () => new Date('2026-07-23T10:00:00.000Z');
  const firstService = createVaultBackupService({ now });
  firstService.setRoot(root);
  const first = firstService.backupMarkdownNote('Topic.md');
  assert.equal(first.ok, true);
  fs.writeFileSync(note, 'second version');
  const failingService = createVaultBackupService({ fs: createAuditFailingFileSystem('backup_note'), now });
  failingService.setRoot(root);

  const result = failingService.backupMarkdownNote('Topic.md');

  assert.equal(result.code, 'audit_failed');
  assert.equal(result.rolledBack, true);
  assert.equal(fs.readFileSync(path.join(root, first.backupPath), 'utf8'), 'first version');
  assert.equal(fs.readFileSync(note, 'utf8'), 'second version');
  assert.deepEqual(fs.readdirSync(path.dirname(path.join(root, first.backupPath))), [path.basename(first.backupPath)]);
});

test('create note preserves a competing file created immediately before exclusive open', () => {
  const root = createTempVault();
  const note = path.join(root, 'Racing.md');
  let injected = false;
  const fileSystem = new Proxy(fs, {
    get(target, property) {
      if (property !== 'openSync' && property !== 'writeFileSync') return target[property];
      return (filePath, ...args) => {
        if (filePath === note && !injected) {
          injected = true;
          fs.writeFileSync(note, 'written by another application');
        }
        return target[property](filePath, ...args);
      };
    }
  });
  const service = createVaultWriteService({ fs: fileSystem });
  service.setRoot(root);

  const result = service.createNote({ title: 'Racing', content: 'our proposal' });

  assert.equal(injected, true);
  assert.equal(result.code, 'file_exists');
  assert.equal(fs.readFileSync(note, 'utf8'), 'written by another application');
  assert.equal(fs.readFileSync(path.join(root, '.vincarios', 'audit.jsonl'), 'utf8'), '');
});

test('create note never deletes a foreign file when directory preparation fails', () => {
  const root = createTempVault();
  const note = path.join(root, 'Untouched.md');
  const service = createVaultWriteService({ fs: new Proxy(fs, {
    get(target, property) {
      if (property !== 'mkdirSync') return target[property];
      return (folder, ...args) => {
        if (folder === root) {
          fs.writeFileSync(note, 'foreign data');
          throw Object.assign(new Error('Access denied'), { code: 'EACCES' });
        }
        return target.mkdirSync(folder, ...args);
      };
    }
  }) });
  service.setRoot(root);

  const result = service.createNote({ title: 'Untouched', content: 'our proposal' });

  assert.equal(result.code, 'write_failed');
  assert.equal(fs.readFileSync(note, 'utf8'), 'foreign data');
});

test('create note removes its own partial output and closes its descriptor after a write failure', () => {
  const root = createTempVault();
  const note = path.join(root, 'Partial.md');
  let opened;
  let closed = false;
  const service = createVaultWriteService({ fs: new Proxy(fs, {
    get(target, property) {
      if (property === 'openSync') return (filePath, ...args) => {
        const descriptor = target.openSync(filePath, ...args);
        if (filePath === note) opened = descriptor;
        return descriptor;
      };
      if (property === 'writeFileSync') return (filePath, content, ...args) => {
        if (filePath === opened || filePath === note) {
          fs.writeFileSync(filePath, String(content).slice(0, 3), ...args);
          throw Object.assign(new Error('Disk full'), { code: 'ENOSPC' });
        }
        return target.writeFileSync(filePath, content, ...args);
      };
      if (property === 'closeSync') return (descriptor) => {
        target.closeSync(descriptor);
        if (descriptor === opened) closed = true;
      };
      return target[property];
    }
  }) });
  service.setRoot(root);

  const result = service.createNote({ title: 'Partial', content: 'our proposal' });

  assert.equal(result.code, 'write_failed');
  assert.equal(result.rolledBack, true);
  assert.equal(typeof opened, 'number');
  assert.equal(closed, true);
  assert.equal(fs.existsSync(note), false);
});

function createAuditFailingFileSystem(failingAction) {
  return new Proxy(fs, {
    get(target, property) {
      if (property !== 'appendFileSync') {
        const value = target[property];
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return function appendFileSync(filePath, content, encoding) {
        if (String(filePath).endsWith(path.join('.vincarios', 'audit.jsonl'))) {
          const entry = JSON.parse(String(content).trim());
          if (entry.action === failingAction) {
            throw new Error('Injected audit failure');
          }
        }
        return target.appendFileSync(filePath, content, encoding);
      };
    }
  });
}

function createTempVault() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-write-transaction-'));
}
