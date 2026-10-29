'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReviewExecutionController } = require('../src/renderer/review/reviewExecutionController');

test('review execution carries generation provenance through to the real audit entry', async (t) => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { createVaultWriteService } = require('../src/main/vault/vaultWriteService');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vincarios-review-provenance-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const service = createVaultWriteService();
  service.setRoot(root);
  const controller = createReviewExecutionController({ api: { vault: service } });
  assert.equal((await controller.executeProposal({ type: 'create_note', title: 'Note',
    content: 'old', originAction: 'save_assistant_response'
  })).ok, true);
  assert.equal((await controller.executeProposal({ type: 'update_note', targetPath: 'Note.md',
    currentContent: 'old', proposedContent: 'new',
    auditMetadata: { origin: 'ai_update', provider: 'ollama', model: 'gemma:12b' }
  })).ok, true);
  const entries = fs.readFileSync(path.join(root, '.vincarios/audit.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(entries[0].provenance.origin, 'save_assistant_response');
  assert.deepEqual(entries[2].provenance, { origin: 'ai_update', provider: 'ollama', model: 'gemma:12b' });
});

test('review execution controller delegates a template proposal as one atomic main request', async () => {
  const calls = [];
  let refreshCount = 0;
  const flashed = [];
  const controller = createReviewExecutionController({
    api: {
      templates: {
        createFromReview: async (proposal) => {
          calls.push(proposal);
          return {
            ok: true,
            path: '02_Projects/Atlas',
            created: ['02_Projects/Atlas/Atlas.md']
          };
        }
      }
    },
    vaultUi: {
      filePanel: {
        refreshTree: async () => { refreshCount += 1; }
      },
      updateFlashState: {
        flashTargets: (targets) => flashed.push(targets)
      }
    }
  });
  const proposal = {
    type: 'create_from_template',
    targetPath: '02_Projects/Atlas',
    folders: ['02_Projects/Atlas'],
    files: [{ path: '02_Projects/Atlas/Atlas.md', content: '# Atlas' }]
  };

  const result = await controller.executeProposal(proposal);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [proposal]);
  assert.equal(refreshCount, 1);
  assert.equal(flashed.length, 1);
  assert.equal(flashed[0][0].path, '02_Projects/Atlas');
});

test('review execution controller keeps create and update writes on existing vault APIs', async () => {
  let previewRefreshPath = '';
  const controller = createReviewExecutionController({
    api: {
      vault: {
        createNote: async () => ({ ok: true, path: '00_Inbox/New.md' }),
        updateNote: async () => ({ ok: true, path: '03_Knowledge/Topic.md' })
      }
    },
    vaultUi: {
      filePanel: {
        refreshTree: async () => {},
        refreshLoadedMarkdown: async (targetPath) => { previewRefreshPath = targetPath; }
      }
    }
  });

  assert.equal((await controller.executeProposal({
    type: 'create_note',
    targetFolder: '00_Inbox',
    title: 'New',
    content: '# New'
  })).ok, true);
  assert.equal((await controller.executeProposal({
    type: 'update_note',
    targetPath: '03_Knowledge/Topic.md',
    currentContent: 'old',
    proposedContent: 'new'
  })).ok, true);
  assert.equal(previewRefreshPath, '03_Knowledge/Topic.md');
});

test('review execution controller records success and failure activity centrally', async () => {
  const entries = [];
  const controller = createReviewExecutionController({
    api: {
      vault: {
        createNote: async () => ({ ok: false, code: 'file_exists', message: 'Target note already exists.' })
      }
    },
    activityReporter: {
      report: (entry) => entries.push(entry)
    }
  });

  const result = await controller.executeProposal({
    type: 'create_note',
    targetFolder: '00_Inbox',
    title: 'Existing',
    content: ''
  });

  assert.equal(result.ok, false);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].activity.type, 'error');
  assert.equal(entries[0].activity.action, 'Created note');
  assert.equal(entries[0].message, 'Target note already exists.');
});
