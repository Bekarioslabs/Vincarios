'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mountUpdateInstructionForm } = require('../src/renderer/selectionActions/updateInstructionForm');

function element(tagName) {
  return { tagName, children: [], dataset: {}, listeners: {}, value: '',
    setAttribute() {}, focus() {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    appendChild(child) { this.children.push(child); child.parentNode = this; },
    remove() { this.parentNode.children = this.parentNode.children.filter((node) => node !== this); this.parentNode = null; }
  };
}

function mount(checkBudget, onSubmit = async () => ({ ok: true })) {
  const previous = global.document;
  global.document = { createElement: element };
  const submitted = [];
  try {
    const form = mountUpdateInstructionForm({ host: element('section'), checkBudget,
      confirmDiscard: () => true, onSubmit: (instruction) => { submitted.push(instruction); return onSubmit(instruction); } });
    return { form, submitted, input: form.children.find((node) => node.tagName === 'textarea'),
      submit: () => form.listeners.submit({ preventDefault() {} }) };
  } finally { global.document = previous; }
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const fits = { ok: true, budget: { state: 'fits', estimated: true, contextTokens: 32768,
  estimatedInputTokens: 2000, responseReserveTokens: 2500, safetyReserveTokens: 3277 } };

test('update form displays observed context and estimates and rechecks on submit', async () => {
  const calls = [];
  const ui = mount(async (instruction) => { calls.push(instruction); return fits; });
  await tick();
  const details = ui.form.children.find((node) => node.tagName === 'details');
  assert.ok(details, 'compact budget details must be present');
  assert.equal(details.dataset.state, 'fits');
  assert.match(details.children[0].textContent, /likely fits/);
  assert.match(details.children[1].textContent, /32,768/);
  ui.input.value = 'Change the heading';
  await ui.submit();
  assert.deepEqual(calls, ['', 'Change the heading']);
  assert.deepEqual(ui.submitted, ['Change the heading']);
});

for (const state of ['too_large', 'unknown']) {
  test(state + ' update check preserves instructions and never submits', async () => {
    const ui = mount(async () => ({ ok: false, error: 'Load or configure the selected model.', budget: { state } }));
    await tick();
    ui.input.value = 'Keep this instruction';
    await ui.submit();
    assert.equal(ui.submitted.length, 0);
    assert.equal(ui.input.value, 'Keep this instruction');
    assert.ok(ui.form.parentNode);
  });
}

test('cancel during a pending budget check cannot dispatch a later update', async () => {
  let resolve;
  const ui = mount(() => new Promise((done) => { resolve = done; }));
  ui.input.value = 'Pending';
  const pending = ui.submit();
  const actions = ui.form.children.find((node) => node.className === 'selection-action-form-actions');
  actions.children[1].listeners.click();
  resolve(fits);
  await pending;
  assert.equal(ui.submitted.length, 0);
});

test('changing instructions during a submit check invalidates the result', async () => {
  let resolve;
  const ui = mount(() => new Promise((done) => { resolve = done; }));
  ui.input.value = 'Original instruction';
  const pending = ui.submit();
  ui.input.value = 'Changed instruction';
  resolve(fits);
  await pending;
  assert.equal(ui.submitted.length, 0);
  assert.ok(ui.form.parentNode);
});

test('missing budget API fails closed in the form', async () => {
  const ui = mount(undefined);
  ui.input.value = 'Change something';
  await ui.submit();
  assert.equal(ui.submitted.length, 0);
});

test('a final Main rejection after successful preflight preserves the instruction and updates the budget', async () => {
  const ui = mount(async () => fits, async () => ({ ok: false, code: 'update_budget_exceeded',
    error: 'Loaded context changed.', budget: { state: 'too_large', contextTokens: 1024 } }));
  ui.input.value = 'Do not lose this instruction';
  await ui.submit();
  assert.ok(ui.form.parentNode);
  assert.equal(ui.input.value, 'Do not lose this instruction');
  assert.equal(ui.form.children.find((node) => node.tagName === 'details').dataset.state, 'too_large');
});

test('a generation failure keeps the form retryable and success closes it', async () => {
  let attempts = 0;
  const ui = mount(async () => fits, async () => ({ ok: ++attempts > 1, code: 'update_response_truncated' }));
  ui.input.value = 'Keep my edit';
  await ui.submit();
  assert.ok(ui.form.parentNode);
  await ui.submit();
  assert.equal(ui.form.parentNode, null);
});
