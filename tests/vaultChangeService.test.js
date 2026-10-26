'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
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
  watchCallback('change', '.vincarios/index/metadata/records.json');
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

test('watcher error closes the watcher, cancels queued changes and invalidates once', () => {
  const watcher = new EventEmitter();
  let closed = 0;
  watcher.close = () => { closed += 1; };
  let callback;
  let flush;
  const cancelled = [];
  const events = [];
  const service = createVaultChangeService({
    watch(_root, _options, listener) { callback = listener; return watcher; },
    setTimeout(listener) { flush = listener; return 7; },
    clearTimeout(id) { cancelled.push(id); }
  });
  service.subscribe((event) => events.push(event));
  service.setRoot('D:/Vault');
  callback('change', 'Topic.md');

  assert.doesNotThrow(() => watcher.emit('error', new Error('Watcher stopped')));
  watcher.emit('error', new Error('Late error'));
  flush();

  assert.equal(closed, 1);
  assert.deepEqual(cancelled, [7]);
  assert.deepEqual(events, [{
    root: 'D:/Vault', affectsMarkdownIndex: true, requiresMetadataRebuild: true,
    markdownPaths: [], watcherUnavailable: true, code: 'vault_watch_unavailable'
  }]);
});

test('old watcher events and queued flush cannot affect a newly opened vault', () => {
  const watchers = [];
  const callbacks = [];
  const timers = [];
  const events = [];
  const service = createVaultChangeService({
    watch(_root, _options, callback) {
      const watcher = new EventEmitter();
      watcher.close = () => {};
      watchers.push(watcher);
      callbacks.push(callback);
      return watcher;
    },
    setTimeout(callback) { timers.push(callback); return timers.length; },
    clearTimeout() {}
  });
  service.subscribe((event) => events.push(event));
  service.setRoot('D:/First');
  callbacks[0]('change', 'First.md');
  service.setRoot('D:/Second');
  callbacks[1]('change', 'Second.md');

  assert.doesNotThrow(() => watchers[0].emit('error', new Error('Old watcher')));
  callbacks[0]('change', 'Old.md');
  timers[0]();
  assert.deepEqual(events, []);
  timers[1]();
  assert.equal(events.length, 1);
  assert.equal(events[0].root, 'D:/Second');
  assert.deepEqual(events[0].markdownPaths, ['Second.md']);
});

test('watch setup failure invalidates health and a later root activation retries normally', () => {
  let calls = 0;
  const events = [];
  const service = createVaultChangeService({
    watch() {
      calls += 1;
      if (calls === 1) throw new Error('Unavailable');
      const watcher = new EventEmitter();
      watcher.close = () => {};
      return watcher;
    }
  });
  service.subscribe((event) => events.push(event));

  assert.equal(service.setRoot('D:/Vault').code, 'vault_watch_unavailable');
  assert.equal(events.length, 1);
  assert.equal(events[0].watcherUnavailable, true);
  assert.equal(service.setRoot('D:/Vault').ok, true);
  assert.equal(calls, 2);
  service.close();
});
