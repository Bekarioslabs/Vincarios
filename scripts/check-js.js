'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', 'tests', 'scripts'];

function collectJsFiles(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJsFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(fullPath);
    }
  }
}

const files = [];
for (const dir of TARGET_DIRS) collectJsFiles(path.join(ROOT, dir), files);
files.sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log('Checked ' + files.length + ' JavaScript files.');