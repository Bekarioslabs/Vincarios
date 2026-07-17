'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVaultChangeService } = require('../src/main/vault/vaultChangeService');

test('vault change service debounces visible vault changes and ignores protected folders', () => {
  let watchCallback = null;
  const timers = [];
  const events = [];
  const service = createVaultChangeService({
    watch(_root, _options, callback) { watchCallback = callback; return { close() {} }; },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    clearTimeout() {}
  });

  service.subscribe((event) => events.push(event));
  service.setRoot('D:/Vault');
  watchCallback('change', '.vitruvios/index/metadata/records.json');
  watchCallback('rename', 'Notes/New.md');
  watchCallback('change', 'Assets/Cover.png');

  assert.equal(timers.length, 1);
  timers[0]();

  assert.deepEqual(events, [{
    root: 'D:/Vault',
    affectsMarkdownIndex: true,
    markdownPaths: ['Notes/New.md'],
    requiresMetadataRebuild: false
  }]);
});

test('vault change service closes the previous watcher when changing vaults', () => {
  const closed = [];
  const service = createVaultChangeService({
    watch(root) { return { close() { closed.push(root); } }; }
  });

  service.setRoot('D:/First');
  service.setRoot('D:/Second');
  service.close();

  assert.deepEqual(closed, ['D:/First', 'D:/Second']);
});

test('vault change service marks unknown and folder events for safe metadata rebuild fallback', () => {
  let watchCallback = null;
  const timers = [];
  const events = [];
  const service = createVaultChangeService({
    watch(_root, _options, callback) { watchCallback = callback; return { close() {} }; },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    clearTimeout() {}
  });

  service.subscribe((event) => events.push(event));
  service.setRoot('D:/Vault');
  watchCallback('rename', 'Notes');
  timers[0]();

  assert.equal(events[0].affectsMarkdownIndex, true);
  assert.equal(events[0].requiresMetadataRebuild, true);
  assert.deepEqual(events[0].markdownPaths, []);
});
