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

test('vault write service creates reviewed folders and appends audit entries', () => {
  const root = createTempVault();
  const service = createVaultWriteService();
  assert.equal(service.setRoot(root).ok, true);

  const result = service.createFolder({
    targetFolder: '02_Projects/Alpha/Knowledge'
  });

  assert.equal(result.ok, true);
  assert.equal(result.path, '02_Projects/Alpha/Knowledge');
  assert.equal(fs.statSync(path.join(root, '02_Projects', 'Alpha', 'Knowledge')).isDirectory(), true);

  const audit = readAudit(root);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, 'create_folder');
  assert.equal(audit[0].path, '02_Projects/Alpha/Knowledge');
  assert.equal(audit[0].result, 'created');
});

test('vault write service rejects unsafe create folder targets', () => {
  const root = createTempVault();
  const service = createVaultWriteService();
  service.setRoot(root);

  assert.equal(service.createFolder({ targetFolder: '../outside' }).code, 'traversal_not_allowed');
  assert.equal(service.createFolder({ targetFolder: '.obsidian' }).code, 'protected_path');
  assert.equal(service.createFolder({ targetFolder: '' }).code, 'invalid_target_folder');
});
test('vault write service rejects unsafe or non-markdown create targets', () => {
  const root = createTempVault();
  const service = createVaultWriteService();
  service.setRoot(root);

  assert.equal(service.createNote({ targetFolder: '../outside', title: 'A', content: 'x' }).code, 'traversal_not_allowed');
  assert.equal(service.createNote({ targetFolder: '.obsidian', title: 'A', content: 'x' }).code, 'protected_path');
  assert.equal(service.createNote({ targetFolder: '00_Inbox', title: 'Bad.exe', content: 'x' }).path, '00_Inbox/Bad.exe.md');
});


test('vault write service rejects oversized create and update note payloads before writing', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Knowledge'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Topic.md'), 'old');
  const service = createVaultWriteService({
    payloadLimits: {
      maxCreateNoteChars: 3,
      maxUpdateNoteChars: 4
    }
  });
  service.setRoot(root);

  const createResult = service.createNote({
    targetFolder: '00_Inbox',
    title: 'Too Large',
    content: 'abcd'
  });
  const updateResult = service.updateNote({
    targetPath: '03_Knowledge/Topic.md',
    currentContent: 'old',
    proposedContent: 'abcde'
  });

  assert.equal(createResult.ok, false);
  assert.equal(createResult.code, 'payload_too_large');
  assert.equal(updateResult.ok, false);
  assert.equal(updateResult.code, 'payload_too_large');
  assert.equal(fs.existsSync(path.join(root, '00_Inbox', 'Too Large.md')), false);
  assert.equal(fs.readFileSync(path.join(root, '03_Knowledge', 'Topic.md'), 'utf8'), 'old');
  assert.equal(fs.existsSync(path.join(root, '.zeus', 'backups')), false);
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

test('vault write service updates YAML frontmatter content with backup', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Knowledge'), { recursive: true });
  const current = '---\ntags: [ai]\nstatus: draft\n---\n\n# Topic\n\nBody.';
  const proposed = '---\ntags: [ai, yaml]\nstatus: active\n---\n\n# Topic\n\nBody.';
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Topic.md'), current);
  const service = createVaultWriteService({ now: () => new Date('2026-06-30T10:00:00.000Z') });
  service.setRoot(root);

  const result = service.updateNote({
    targetPath: '03_Knowledge/Topic.md',
    currentContent: current,
    proposedContent: proposed
  });

  assert.equal(result.ok, true);
  assert.equal(fs.readFileSync(path.join(root, '03_Knowledge', 'Topic.md'), 'utf8'), proposed);
  assert.equal(fs.readFileSync(path.join(root, result.backupPath), 'utf8'), current);
});

test('vault write service renames one Markdown file in place and appends audit entry', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Knowledge'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Old Name.md'), '# Old');
  const service = createVaultWriteService();
  service.setRoot(root);

  const result = service.renameFile({
    sourcePath: '03_Knowledge/Old Name.md',
    newName: 'New Name'
  });

  assert.equal(result.ok, true);
  assert.equal(result.action, 'rename_file');
  assert.equal(result.path, '03_Knowledge/Old Name.md');
  assert.equal(result.targetPath, '03_Knowledge/New Name.md');
  assert.equal(result.linksUpdated, false);
  assert.equal(fs.existsSync(path.join(root, '03_Knowledge', 'Old Name.md')), false);
  assert.equal(fs.readFileSync(path.join(root, '03_Knowledge', 'New Name.md'), 'utf8'), '# Old');

  const audit = readAudit(root);
  assert.equal(audit[0].action, 'rename_file');
  assert.equal(audit[0].path, '03_Knowledge/Old Name.md');
  assert.equal(audit[0].targetPath, '03_Knowledge/New Name.md');
  assert.equal(audit[0].linksUpdated, false);
});

test('vault write service keeps Rename Light in the same folder and prevents overwrite', () => {
  const root = createTempVault();
  fs.mkdirSync(path.join(root, '03_Knowledge'), { recursive: true });
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Old.md'), 'old');
  fs.writeFileSync(path.join(root, '03_Knowledge', 'Existing.md'), 'existing');
  const service = createVaultWriteService();
  service.setRoot(root);

  assert.equal(service.renameFile({ sourcePath: '03_Knowledge/Old.md', newName: '../Move.md' }).code, 'path_not_allowed');
  assert.equal(service.renameFile({ sourcePath: '03_Knowledge/Old.md', newName: 'Existing.md' }).code, 'file_exists');
  assert.equal(fs.readFileSync(path.join(root, '03_Knowledge', 'Old.md'), 'utf8'), 'old');
});