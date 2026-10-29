'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createReviewBasketState } = require('../src/renderer/review/reviewBasketState');

function createElement(tagName) {
  const classes = new Set();
  return {
    tagName, children: [], dataset: {}, listeners: {}, textContent: '', value: '',
    classList: { add(name) { classes.add(name); } },
    setAttribute() {},
    addEventListener(type, listener) { this.listeners[type] = listener; },
    appendChild(child) { child.parentNode = this; this.children.push(child); },
    remove() {
      if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    },
    focus() {},
    querySelectorAll(selector) {
      return this.children.flatMap((child) => [
        ...(String(child.className || '').split(' ').includes(selector.slice(1)) ? [child] : []),
        ...child.querySelectorAll(selector)
      ]);
    }
  };
}

async function submitUpdate({ content, draftContent, responseContent = '# Revised\n' }) {
  const root = createElement('section');
  const chatLog = createElement('section');
  const status = createElement('div');
  const targetPath = '03_Knowledge/Test.md';
  const reviewBasket = createReviewBasketState();
  if (draftContent !== undefined) {
    reviewBasket.upsertOpenUpdateProposal({
      type: 'update_note', targetPath, currentContent: content,
      proposedContent: draftContent, title: 'Existing draft'
    }, 'content_update');
  }
  const before = reviewBasket.getSnapshot();
  const requests = [];
  const sandbox = vm.createContext({
    setTimeout, clearTimeout,
    document: { createElement },
    window: {
      VincariosSelectionActionRegistry: require('../src/renderer/selectionActions/actionRegistry'),
      VincariosSelectionActionCategories: require('../src/renderer/selectionActions/actionCategories'),
      VincariosSelectedUpdateProposalAction: require('../src/renderer/chat/selectedUpdateProposalAction')
    }
  });
  for (const fileName of ['updateInstructionForm.js', 'mountSelectionActions.js']) {
    const filePath = path.join(__dirname, '../src/renderer/selectionActions', fileName);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), sandbox, { filename: filePath });
  }
  const controller = sandbox.window.VincariosSelectionActions.mountSelectionActions({
    app: {
      querySelector(selector) { return selector === '.selection-actions-content' ? root : chatLog; },
      addEventListener() {}, removeEventListener() {}
    },
    contextState: { snapshot: () => ({ kind: 'file', path: targetPath, content, readAllowed: true, writeAllowed: true }) },
    reviewBasket, status,
    api: {
      chat: {
        async checkUpdateBudget() { return { ok: true, budget: { state: 'fits' } }; },
        async send(request) {
          requests.push(request);
          return { ok: true, provider: { id: 'lm-studio', selectedModel: 'auto' }, model: 'google/gemma-4-12b-qat',
            message: { content: JSON.stringify({ proposedContent: responseContent }) } };
        }
      }
    }
  });
  const row = root.children.find((child) => child.dataset.actionId === 'file.proposeUpdate');
  row.children[0].listeners.click();
  const form = row.children.find((child) => child.tagName === 'form');
  form.children.find((child) => child.tagName === 'textarea').value = 'Fix the heading.';
  form.listeners.submit({ preventDefault() {} });
  await new Promise((resolve) => setImmediate(resolve));
  controller.destroy();
  return { requests, before, after: reviewBasket.getSnapshot(), chatLog, status };
}

for (const useDraft of [false, true]) {
  test('Selection Action rejects oversized ' + (useDraft ? 'open draft' : 'selected note') + ' before provider dispatch', async () => {
    const result = await submitUpdate({
      content: useDraft ? '# Original\n' : 'x'.repeat(20001),
      draftContent: useDraft ? 'x'.repeat(20001) : undefined
    });
    assert.equal(result.requests.length, 0);
    assert.deepEqual(result.after, result.before);
    const bodies = result.chatLog.children.map((message) => message.children[1].textContent);
    assert.equal(bodies.some((body) => /too long for a whole-note AI update/.test(body)), true);
    assert.equal(bodies.some((body) => /Preparing update proposal/.test(body)), false);
  });
}

test('Selection Action sends the complete open draft and retains the disk baseline after refresh', async () => {
  const result = await submitUpdate({ content: '# Original\n', draftContent: '# Draft\n' });
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].purpose, 'whole_note_update');
  assert.equal(result.requests[0].messages[1].content.includes('```md\n# Draft\n\n```'), true);
  assert.equal(result.after.items.length, 1);
  assert.equal(result.after.items[0].id, result.before.items[0].id);
  assert.equal(result.after.items[0].currentContent, '# Original\n');
  assert.equal(result.after.items[0].proposedContent, '# Revised\n');
});
