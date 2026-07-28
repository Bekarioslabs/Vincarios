'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createReviewedTemplateService } = require('../src/main/templates/reviewedTemplateService');

test('reviewed template creation commits folders, files, and one audit entry together', () => {
  const root = createVault();
  const service = createReviewedTemplateService();
  assert.equal(service.setRoot(root).ok, true);

  const result = service.createFromReview(createPlan());

  assert.equal(result.ok, true);
  assert.deepEqual(result.created, [
    '02_Projects/Atlas/Atlas.md',
    '02_Projects/Atlas/Notes/Research.md'
  ]);
  assert.equal(fs.readFileSync(path.join(root, '02_Projects', 'Atlas', 'Atlas.md'), 'utf8'), '# Atlas');
  const audit = readAudit(root);
  assert.equal(audit.length, 1);
  assert.equal(audit[0].action, 'create_from_template');
  assert.deepEqual(audit[0].created, result.created);
});

test('reviewed template creation rolls back every new path when a later file fails', () => {
  const root = createVault();
  const service = createReviewedTemplateService({
    fs: failWriteFor('Research.md')
  });
  service.setRoot(root);

  const result = service.createFromReview(createPlan());

  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.equal(fs.existsSync(path.join(root, '02_Projects', 'Atlas')), false);
  assert.deepEqual(readAudit(root), []);
});

test('reviewed template creation rolls back the project when its audit append fails', () => {
  const root = createVault();
  const service = createReviewedTemplateService({
    fs: failAuditAppend()
  });
  service.setRoot(root);

  const result = service.createFromReview(createPlan());

  assert.equal(result.ok, false);
  assert.equal(result.code, 'audit_failed');
  assert.equal(result.rolledBack, true);
  assert.equal(fs.existsSync(path.join(root, '02_Projects', 'Atlas')), false);
});

test('reviewed template creation fails before mutation when any target exists', () => {
  const root = createVault();
  const existing = path.join(root, '02_Projects', 'Atlas', 'Atlas.md');
  fs.mkdirSync(path.dirname(existing), { recursive: true });
  fs.writeFileSync(existing, 'keep me', 'utf8');
  const service = createReviewedTemplateService();
  service.setRoot(root);

  const result = service.createFromReview(createPlan());

  assert.equal(result.ok, false);
  assert.equal(result.code, 'template_target_exists');
  assert.equal(fs.readFileSync(existing, 'utf8'), 'keep me');
  assert.equal(fs.existsSync(path.join(root, '02_Projects', 'Atlas', 'Notes', 'Research.md')), false);
});

function createPlan() {
  return {
    targetPath: '02_Projects/Atlas',
    folders: [
      '02_Projects/Atlas',
      '02_Projects/Atlas/Notes'
    ],
    files: [
      { path: '02_Projects/Atlas/Atlas.md', content: '# Atlas' },
      { path: '02_Projects/Atlas/Notes/Research.md', content: '# Research' }
    ]
  };
}

function createVault() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-reviewed-template-'));
  fs.mkdirSync(path.join(root, '02_Projects'), { recursive: true });
  return root;
}

function readAudit(root) {
  const auditPath = path.join(root, '.vincarios', 'audit.jsonl');
  if (!fs.existsSync(auditPath)) return [];
  return fs.readFileSync(auditPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function failWriteFor(fileName) {
  return new Proxy(fs, {
    get(target, property) {
      if (property !== 'writeFileSync') return bind(target, property);
      return (filePath, ...args) => {
        if (path.basename(String(filePath)) === fileName) throw new Error('Injected template write failure');
        return target.writeFileSync(filePath, ...args);
      };
    }
  });
}

function failAuditAppend() {
  return new Proxy(fs, {
    get(target, property) {
      if (property !== 'appendFileSync') return bind(target, property);
      return (filePath, ...args) => {
        if (String(filePath).endsWith(path.join('.vincarios', 'audit.jsonl'))) {
          throw new Error('Injected audit failure');
        }
        return target.appendFileSync(filePath, ...args);
      };
    }
  });
}

function bind(target, property) {
  const value = target[property];
  return typeof value === 'function' ? value.bind(target) : value;
}
