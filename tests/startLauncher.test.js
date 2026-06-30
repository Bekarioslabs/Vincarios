'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('start launcher uses a stable writable Electron cache and user-data directory', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'start.bat'), 'utf8');

  assert.match(source, /ZEUS_USER_DATA/);
  assert.match(source, /ZEUS_DISK_CACHE/);
  assert.match(source, /mkdir "%ZEUS_USER_DATA%"/);
  assert.match(source, /--user-data-dir="%ZEUS_USER_DATA%"/);
  assert.match(source, /--disk-cache-dir="%ZEUS_DISK_CACHE%"/);
});