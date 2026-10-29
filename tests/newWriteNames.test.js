'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');
const { createVaultReadService } = require('../src/main/vault/vaultReadService');
const { createReviewedTemplateService } = require('../src/main/templates/reviewedTemplateService');
const { materializePreset } = require('../src/shared/templates/presetRegistry');
const { createNoteProposalsFromPlan } = require('../src/shared/templates/presetProposals');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-write-name-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'Notes'));
  fs.writeFileSync(path.join(root, 'Notes/Original.md'), '# Original\n');
  const writer = createVaultWriteService();
  assert.equal(writer.setRoot(root).ok, true);
  return { root, writer };
}

const invalidNames = [
  '',
  'CON', 'nul.txt', 'AUX.tar.gz', 'COM1', 'lpt9', 'COM\u00b9', 'LPT\u00b3',
  'Trailing.', 'Trailing ', ' Leading', 'Bad\tName', 'Bad\nName', 'Bad\0Name',
  'Bad:name', 'Bad/name', 'Bad\\name', 'Bad?name', 'Bad*name', 'Bad"name',
  'Bad<name', 'Bad>name', 'Bad|name', 'Bad[name', 'Bad]name', 'Bad#name', 'Bad^name',
  'a'.repeat(256)
];

test('new note and rename reject unsafe names without sanitizing or writing', (t) => {
  const { root, writer } = fixture(t);
  for (const name of invalidNames) {
    const created = writer.createNote({ targetFolder: 'Notes', title: name, content: '# New\n' });
    assert.equal(created.ok, false, 'create: ' + JSON.stringify(name));
    assert.ok(created.message, JSON.stringify(created));
    const renamed = writer.renameFile({ sourcePath: 'Notes/Original.md', newName: name });
    assert.equal(renamed.ok, false, 'rename: ' + JSON.stringify(name));
  }
  assert.deepEqual(fs.readdirSync(path.join(root, 'Notes')), ['Original.md']);
  assert.equal(fs.existsSync(path.join(root, '.vincarios')), false);
});

test('new folder segments and template artifacts use the same write-name restrictions', (t) => {
  const { root, writer } = fixture(t);
  const templates = createReviewedTemplateService();
  templates.setRoot(root);
  for (const name of invalidNames.filter((value) => value && !/[\\/]/.test(value))) {
    assert.equal(writer.createFolder({ targetFolder: 'Notes/' + name }).ok, false, 'folder: ' + JSON.stringify(name));
    assert.equal(writer.createNote({ targetFolder: 'Notes/' + name, title: 'Child', content: 'x' }).ok, false, 'parent: ' + JSON.stringify(name));
    const fileName = /[. ]$/.test(name) ? 'Unsafe.md' + name.slice(-1) : name + '.md';
    const result = templates.createFromReview({ targetPath: 'Notes/Project', folders: [], files: [{ path: 'Notes/Project/' + fileName, content: 'x' }] });
    assert.equal(result.ok, false, 'template: ' + JSON.stringify(name));
  }
  assert.equal(fs.existsSync(path.join(root, 'Notes/Project')), false);
});

test('preset names are validated instead of silently transformed', () => {
  for (const name of invalidNames) {
    assert.throws(() => materializePreset('note.default', { title: name }), undefined, JSON.stringify(name));
    assert.throws(() => materializePreset('project.default', { projectName: name }), undefined, JSON.stringify(name));
  }
  const plan = materializePreset('project.default', { projectName: 'Aurora & M\u00fcnchen!' });
  assert.equal(plan.rootPath, '02_Projects/Aurora & M\u00fcnchen!');
  assert.equal(plan.files[0].path, '02_Projects/Aurora & M\u00fcnchen!/Aurora & M\u00fcnchen!.md');
});

test('name length includes the final Markdown suffix and keeps valid text exactly', (t) => {
  const { writer } = fixture(t);
  assert.equal(writer.createNote({ title: 'a'.repeat(253), content: 'x' }).ok, false);
  assert.equal(writer.renameFile({ sourcePath: 'Notes/Original.md', newName: 'a'.repeat(253) }).ok, false);
  const created = writer.createNote({ title: 'Aurora  & M\u00fcnchen!.MARKDOWN', content: 'x' });
  assert.equal(created.path, 'Aurora  & M\u00fcnchen!.MARKDOWN');
  assert.equal(writer.renameFile({ sourcePath: created.path, newName: 'Renamed  Note' }).targetPath, 'Renamed  Note.MARKDOWN');
  assert.throws(() => materializePreset('note.default', { title: 'a'.repeat(253) }), /255/);
  assert.throws(() => materializePreset('project.default', { projectName: 'a'.repeat(253) }), /255/);
});

test('existing link-delimiter names remain listed, readable and editable', (t) => {
  const { root, writer } = fixture(t);
  const relativePath = 'Notes/Old [draft] #1.md';
  fs.writeFileSync(path.join(root, relativePath), '# Existing\n');
  fs.mkdirSync(path.join(root, 'Old #folder'));
  const reader = createVaultReadService();
  reader.setRoot(root);
  assert.ok(reader.listFolder('Notes').entries.some((entry) => entry.path === relativePath));
  assert.equal(reader.readMarkdown(relativePath).content, '# Existing\n');
  assert.equal(writer.updateNote({ targetPath: relativePath, currentContent: '# Existing\n', proposedContent: '# Kept\n' }).ok, true);
  assert.equal(writer.createNote({ targetFolder: 'Old #folder', title: 'New Note', content: 'x' }).ok, true);
});

test('note preset previews and executed targets agree even with an explicit Markdown suffix', (t) => {
  const { writer } = fixture(t);
  for (const title of ['Aurora', 'Field.MD', 'Guide.markdown', 'Double.markdown.md', 'Report..md', 'Spaced .md']) {
    const plan = materializePreset('note.default', { title });
    const proposal = createNoteProposalsFromPlan(plan)[0];
    const created = writer.createNote(proposal);
    assert.equal(created.ok, true, JSON.stringify(created));
    assert.equal(created.path, plan.files[0].path);
    assert.equal(created.path, '00_Inbox/' + title + (title === 'Aurora' ? '.md' : ''));
  }
});

test('write-name validator has browser parity and checks final UTF-16 boundaries', () => {
  const vm = require('node:vm');
  const names = require('../src/shared/pathRules/newNames');
  const browser = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/shared/pathRules/newNames.js'), 'utf8'), browser);
  for (const value of invalidNames.concat(['Aurora  !', 'a'.repeat(255), '\ud83c\udf05'.repeat(127), '\ud83c\udf05'.repeat(128), 'COM10', 'LPT0'])) {
    assert.deepEqual(JSON.parse(JSON.stringify(browser.window.VincariosNewNames.validateNewName(value))), names.validateNewName(value));
  }
  assert.equal(names.validateNewName('a'.repeat(255)).ok, true);
  assert.equal(names.validateNewName('\ud83c\udf05'.repeat(128)).ok, false);
});
