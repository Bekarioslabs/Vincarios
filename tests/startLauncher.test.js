'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('start launcher uses portable Electron cache and user-data directories', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'start.bat'), 'utf8');

  assert.match(source, /VITRUVIOS_USER_DATA/);
  assert.match(source, /VITRUVIOS_DISK_CACHE/);
  assert.match(source, /mkdir "%VITRUVIOS_USER_DATA%"/);
  assert.match(source, /VITRUVIOS_PORTABLE_DATA=%APP_DIR%\.vitruvios/);
  assert.doesNotMatch(source, /LOCALAPPDATA.*VITRUVIOS_AGENT/);
  assert.match(source, /--user-data-dir="%VITRUVIOS_USER_DATA%"/);
  assert.match(source, /--disk-cache-dir="%VITRUVIOS_DISK_CACHE%"/);
});
