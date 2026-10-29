'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const reviewState = require('../src/renderer/review/reviewBasketState');
const { mountReviewBasket } = require('../src/renderer/review/mountReviewBasket');
const modalBehavior = require('../src/renderer/ui/modalBehavior');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = new Map();
    this.className = '';
    this.disabled = false;
    this.checked = false;
  }
  set innerHTML(value) { this.children = []; this.textContent = value; }
  setAttribute(name, value) { this.attributes[name] = value; }
  hasAttribute(name) { return name in this.attributes; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  removeEventListener(type) { this.listeners.delete(type); }
  appendChild(child) { this.children.push(child); child.parent = this; return child; }
  remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
  focus() { document.activeElement = this; }
  select() {}
  fire(type) { return this.listeners.get(type)?.({ target: this, preventDefault() {} }); }
}

function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}

function mount(t, proposal) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  global.document = { body: new Element(), createElement: (tag) => new Element(tag), activeElement: null };
  global.window = { VincariosReviewBasketState: reviewState, VincariosModalBehavior: modalBehavior };
  t.after(() => { global.window = previousWindow; global.document = previousDocument; });
  const nodes = Object.fromEntries(['#review-basket-items', '#review-execute', '#review-clear', '#review-clear-done', '#review-basket-count'].map((id) => [id, new Element()]));
  const executions = [];
  const basket = mountReviewBasket({
    app: { querySelector: (id) => nodes[id] },
    executeProposal: async (item) => { executions.push(item); return { ok: true, path: item.targetPath }; }
  });
  const item = basket.addProposal(Object.assign({ type: 'update_note', targetPath: 'Note.md' }, proposal));
  basket.setSelected(item.id, true);
  return { basket, nodes, executions, execute: () => nodes['#review-execute'].fire('click') };
}

test('high-risk update focuses Cancel and requires a fresh explicit acknowledgement', async (t) => {
  const fixture = mount(t, { currentContent: 'Original note content. '.repeat(40), proposedContent: 'Short replacement.' });
  const execution = fixture.execute();
  const apply = find(document.body, (node) => node.textContent === 'Apply update');
  const cancel = find(document.body, (node) => node.textContent === 'Cancel');
  const checkbox = find(document.body, (node) => node.type === 'checkbox');
  assert.equal(document.activeElement, cancel);
  assert.equal(apply.disabled, true);
  assert.ok(checkbox && checkbox.attributes['aria-label']);
  assert.ok(find(fixture.nodes['#review-basket-items'], (node) => node.dataset.updateRisk === 'high'));
  apply.fire('click');
  assert.equal(fixture.executions.length, 0);
  checkbox.checked = true;
  checkbox.fire('change');
  assert.equal(apply.disabled, false);
  checkbox.checked = false;
  checkbox.fire('change');
  assert.equal(apply.disabled, true);
  await cancel.fire('click');
  await execution;
  assert.equal(fixture.executions.length, 0);

  const retry = fixture.execute();
  const secondCheck = find(document.body, (node) => node.type === 'checkbox');
  const secondApply = find(document.body, (node) => node.textContent === 'Apply update');
  assert.equal(secondCheck.checked, false);
  assert.equal(secondApply.disabled, true);
  secondCheck.checked = true;
  secondCheck.fire('change');
  secondApply.fire('click');
  await retry;
  assert.equal(fixture.executions.length, 1);
});

test('normal update has no extra checkbox but still focuses Cancel', async (t) => {
  const fixture = mount(t, { currentContent: 'Keep this note.', proposedContent: 'Keep this note. Add a detail.' });
  const execution = fixture.execute();
  const apply = find(document.body, (node) => node.textContent === 'Apply update');
  assert.equal(document.activeElement.textContent, 'Cancel');
  assert.equal(find(document.body, (node) => node.type === 'checkbox'), null);
  assert.equal(apply.disabled, false);
  apply.fire('click');
  await execution;
  assert.equal(fixture.executions.length, 1);
});

test('blocked empty replacement cannot open confirmation or reach execution', async (t) => {
  const fixture = mount(t, { currentContent: 'Existing note.', proposedContent: '' });
  await fixture.execute();
  assert.equal(document.body.children.length, 0);
  assert.equal(fixture.executions.length, 0);
});

for (const type of ['create_note', 'create_from_template']) {
  test('Review edit preserves names and rejects unsafe replacements: ' + type, (t) => {
    const fixture = mount(t, { type, title: 'Original', targetPath: 'Projects/Original', templatePlanRootPath: 'Projects/Original',
      folders: [], files: [{ path: 'Projects/Original/Overview.md', content: '# Original\n' }], content: '# Original\n' });
    find(fixture.nodes['#review-basket-items'], (node) => node.textContent === 'Edit').fire('click');
    const input = find(document.body, (node) => node.className === 'review-modal-title-input');
    const save = find(document.body, (node) => node.textContent === 'Save changes');
    for (const name of ['Bad:name', 'CON', 'Trailing ', 'Bad#Name']) {
      input.value = name;
      save.fire('click');
      assert.equal(document.body.children.length, 1, JSON.stringify(name));
      assert.equal(fixture.basket.getSnapshot().items[0].title, 'Original');
      const error = find(document.body, (node) => node.attributes.role === 'alert');
      assert.ok(error && error.textContent);
    }
    input.value = 'Aurora  Lab!';
    save.fire('click');
    const item = fixture.basket.getSnapshot().items[0];
    assert.equal(item.title, 'Aurora  Lab!');
    if (type === 'create_from_template') assert.equal(item.targetPath, 'Projects/Aurora  Lab!');
    assert.equal(document.body.children.length, 0);
  });
}
