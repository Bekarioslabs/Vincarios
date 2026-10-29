'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { mountCreationPresets } = require('../src/renderer/templates/mountCreationPresets');

class Element {
  constructor() { this.children = []; this.listeners = new Map(); this.nodes = {}; }
  setAttribute() {}
  appendChild(child) { this.children.push(child); child.parentNode = this; }
  removeChild(child) { this.children = this.children.filter((item) => item !== child); child.parentNode = null; }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
  querySelector(selector) { return this.nodes[selector] || (this.nodes[selector] = new Element()); }
  focus() { document.activeElement = this; }
  select() {}
  click() { if (!this.disabled) return this.listeners.get('click')?.(); }
  fire(type) { return this.listeners.get(type)?.({ preventDefault() {} }); }
}

for (const type of ['note', 'project']) {
  test('creation dialog retains invalid ' + type + ' input without adding proposals or closing', async (t) => {
    const previousDocument = global.document;
    const previousWindow = global.window;
    global.document = { body: new Element(), createElement: () => new Element() };
    global.window = { VincariosModalBehavior: { mountModalBehavior: () => ({ focusInitial() {} }) } };
    t.after(() => { global.document = previousDocument; global.window = previousWindow; });
    const app = new Element();
    const proposals = [];
    mountCreationPresets({
      app,
      status: new Element(),
      reviewBasket: { addProposal: (proposal) => proposals.push(proposal) },
      vaultProfileState: { getProfile: () => ({ roles: { inbox: 'Notes', projects: 'Projects' } }) }
    });
    app.querySelector('[data-preset-list="' + type + '"]').children[0].click();
    await Promise.resolve();
    const overlay = document.body.children[0];
    const modal = overlay.children[0];
    const input = modal.querySelector('.review-modal-title-input');
    const confirm = modal.querySelector('.review-modal-confirm');
    const preview = modal.querySelector('.review-modal-preview');
    input.value = 'CON';
    input.fire('input');
    assert.match(preview.textContent, /reserved by Windows/);
    assert.doesNotThrow(() => confirm.click());
    assert.deepEqual(proposals, []);
    assert.equal(document.body.children[0], overlay);
    assert.equal(document.activeElement, input);
    input.value = 'Aurora  Lab!';
    input.fire('input');
    assert.match(preview.textContent, /Aurora  Lab!/);
    confirm.click();
    assert.equal(proposals.length, 1);
    assert.equal(document.body.children.length, 0);
    assert.equal(type === 'note' ? proposals[0].title : proposals[0].targetPath, type === 'note' ? 'Aurora  Lab!.md' : 'Projects/Aurora  Lab!');
  });
}
