'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { assessUpdateRisk } = require('../src/shared/actions/diffPreview');
const { createReviewBasketState } = require('../src/renderer/review/reviewBasketState');

const lines = (count) => Array.from({ length: count }, (_, i) => 'Original line ' + i + ': useful content.');

test('update risk is exported to the existing browser diff API', () => {
  const browser = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/shared/metadata/frontmatterContract.js'), 'utf8'), browser);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src/shared/actions/diffPreview.js'), 'utf8'), browser);
  assert.equal(typeof browser.window.VincariosDiffPreview.assessUpdateRisk, 'function');
});

test('empty, invalid and undiffable proposed updates are blocked', () => {
  assert.equal(assessUpdateRisk({ currentContent: 'Before', proposedContent: ' \n ' }).level, 'blocked');
  assert.equal(assessUpdateRisk({ currentContent: null, proposedContent: 'After' }).level, 'blocked');
  assert.equal(assessUpdateRisk({ currentContent: 'Before', proposedContent: 'After', diffPreview: { ok: false } }).level, 'blocked');
  assert.equal(assessUpdateRisk({ currentContent: 'Before', proposedContent: 'x'.repeat(350001) }).level, 'blocked');
});

test('ten removed lines at thirty percent trigger high risk, nearby boundaries do not', () => {
  const before = lines(33);
  assert.equal(assessUpdateRisk({ currentContent: before.join('\n'), proposedContent: before.slice(10).join('\n') }).level, 'high');
  assert.equal(assessUpdateRisk({ currentContent: before.join('\n'), proposedContent: before.slice(9).join('\n') }).level, 'normal');
  const longer = lines(34);
  assert.equal(assessUpdateRisk({ currentContent: longer.join('\n'), proposedContent: longer.slice(10).join('\n') }).level, 'normal');
});

test('text length below sixty percent warns but the exact boundary does not', () => {
  assert.equal(assessUpdateRisk({ currentContent: 'a'.repeat(100), proposedContent: 'a'.repeat(59) }).level, 'high');
  assert.equal(assessUpdateRisk({ currentContent: 'a'.repeat(100), proposedContent: 'a'.repeat(60) }).level, 'normal');
});

test('removing frontmatter warns, while a YAML-only property change stays normal', () => {
  const currentContent = '---\ntags: [draft]\n---\n' + 'Body. '.repeat(60);
  assert.equal(assessUpdateRisk({ currentContent, proposedContent: 'Body. '.repeat(60) }).level, 'high');
  assert.equal(assessUpdateRisk({ currentContent, proposedContent: currentContent.replace('draft', 'final') }).level, 'normal');
});

test('a deliberate large rewrite remains reviewable as high risk, not blocked', () => {
  const result = assessUpdateRisk({ currentContent: lines(30).join('\n'), proposedContent: lines(30).map((s) => s.replace('Original', 'Rewritten')).join('\n') });
  assert.equal(result.level, 'high');
  assert.ok(result.reasons.length > 0);
});

test('risk ignores LF versus CRLF and a final newline when counting lines', () => {
  const before = lines(33);
  const after = before.slice(10);
  for (const eol of ['\n', '\r\n']) {
    assert.equal(assessUpdateRisk({ currentContent: before.join(eol) + eol, proposedContent: after.join(eol) + eol }).level, 'high');
  }
  assert.equal(assessUpdateRisk({ currentContent: 'Before\r\n', proposedContent: 'Before\n' }).level, 'normal');
});

test('adding content to an empty note is not a destructive replacement', () => {
  assert.equal(assessUpdateRisk({ currentContent: '', proposedContent: '# New body' }).level, 'normal');
});

test('basket derives high risk on ingestion and restore despite forged low-risk fields', () => {
  const proposal = { type: 'update_note', targetPath: 'Note.md', currentContent: lines(30).join('\n'), proposedContent: 'Short replacement.', risk: 'low', updateRisk: { level: 'normal', reasons: [] } };
  const basket = createReviewBasketState();
  assert.equal(basket.addProposal(proposal).updateRisk.level, 'high');
  basket.restoreSnapshot({ items: [proposal] });
  assert.equal(basket.getSnapshot().items[0].updateRisk.level, 'high');
});

test('basket blocks empty or undiffable replacements even when explicitly selected', () => {
  for (const proposedContent of ['', 'x'.repeat(350001)]) {
    const basket = createReviewBasketState();
    const item = basket.addProposal({ type: 'update_note', targetPath: 'Note.md', currentContent: 'Existing', proposedContent, selected: true });
    assert.equal(item.updateRisk.level, 'blocked');
    assert.equal(item.executable, false);
    basket.setSelected(item.id, true);
    assert.deepEqual(basket.getSelectedOpenItems(), []);
  }
});

test('editing a proposal recomputes the diff and cannot retain a forged previous risk', () => {
  const basket = createReviewBasketState();
  const item = basket.addProposal({ type: 'update_note', targetPath: 'Note.md', currentContent: 'Existing note content.', proposedContent: 'Existing note content. Added.' });
  const high = basket.updateProposal(item.id, { proposedContent: 'Short', updateRisk: { level: 'normal' } });
  assert.equal(high.updateRisk.level, 'high');
  const blocked = basket.updateProposal(item.id, { proposedContent: '' });
  assert.equal(blocked.executable, false);
  const restored = basket.updateProposal(item.id, { proposedContent: 'Existing note content. Revised.' });
  assert.equal(restored.updateRisk.level, 'normal');
  assert.equal(restored.executable, true);
  assert.equal(restored.diffUnavailable, undefined);
});

test('basket rejects non-string sources before schema normalization can disguise them', () => {
  for (const invalid of [{}, [], 42, null]) {
    for (const field of ['currentContent', 'proposedContent']) {
      const proposal = { type: 'update_note', targetPath: 'Note.md', currentContent: 'Keep this note.', proposedContent: 'Keep this note. Added.', [field]: invalid };
      const basket = createReviewBasketState();
      assert.equal(basket.addProposal(proposal).updateRisk.level, 'blocked');
      basket.restoreSnapshot({ items: [proposal] });
      assert.equal(basket.getSnapshot().items[0].executable, false);
    }
  }
});

test('explicit empty canonical content cannot fall back to an old alias', () => {
  const basket = createReviewBasketState();
  const proposal = { type: 'update_note', targetPath: 'Note.md', currentContent: 'Keep this note.', proposedContent: '', afterContent: 'Old alias text.' };
  assert.equal(basket.addProposal(proposal).updateRisk.level, 'blocked');
  basket.restoreSnapshot({ items: [proposal] });
  assert.equal(basket.getSnapshot().items[0].executable, false);
  const updated = basket.updateProposal(basket.getSnapshot().items[0].id, { proposedContent: 'Keep this note. Added.' });
  assert.equal(updated.executable, true);
  assert.equal(basket.updateProposal(updated.id, { proposedContent: '' }).updateRisk.level, 'blocked');
});

test('risk recognizes every supported frontmatter closing delimiter and trailing whitespace', () => {
  const body = 'Body. '.repeat(60);
  for (const start of ['---', '---  \t']) for (const end of ['---', '...', '... \t', '--- \t']) {
    assert.equal(assessUpdateRisk({ currentContent: start + '\ntags: [draft]\n' + end + '\n' + body, proposedContent: body }).level, 'high');
  }
});

test('removing a final newline does not turn nine deleted physical lines into ten', () => {
  const original = lines(33);
  assert.equal(assessUpdateRisk({ currentContent: original.join('\n') + '\n', proposedContent: original.slice(9).join('\n') }).level, 'normal');
});
