'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('start launcher uses portable Electron cache and user-data directories', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'start.bat'), 'utf8');

  assert.match(source, /VINCARIOS_USER_DATA/);
  assert.match(source, /VINCARIOS_DISK_CACHE/);
  assert.match(source, /mkdir "%VINCARIOS_USER_DATA%"/);
  assert.match(source, /VINCARIOS_PORTABLE_DATA=%APP_DIR%\.vincarios/);
  assert.doesNotMatch(source, /LOCALAPPDATA.*VINCARIOS_AGENT/);
  assert.match(source, /--user-data-dir="%VINCARIOS_USER_DATA%"/);
  assert.match(source, /--disk-cache-dir="%VINCARIOS_DISK_CACHE%"/);
});
