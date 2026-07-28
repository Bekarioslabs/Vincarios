'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REVIEWED_LICENSE_EXPRESSIONS = new Set([
  '0BSD',
  '(MIT OR CC0-1.0)',
  'Apache-2.0',
  'Apache-2.0 AND LGPL-3.0-or-later',
  'Apache-2.0 AND LGPL-3.0-or-later AND MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'LGPL-3.0-or-later',
  'MIT',
  'Python-2.0',
]);

function packageNameFromLockPath(lockPath) {
  const normalized = String(lockPath || '').replace(/\\/g, '/');
  const marker = '/node_modules/';
  const nestedIndex = normalized.lastIndexOf(marker);
  if (nestedIndex >= 0) return normalized.slice(nestedIndex + marker.length);
  return normalized.replace(/^node_modules\//, '');
}

function collectRuntimeLicenses(packages) {
  const byIdentity = new Map();
  for (const [lockPath, entry] of Object.entries(packages || {})) {
    if (!lockPath || !entry || entry.dev) continue;
    const item = {
      name: packageNameFromLockPath(lockPath),
      version: String(entry.version || ''),
      license: String(entry.license || '').trim(),
    };
    const identity = item.name + '@' + item.version + ':' + item.license;
    byIdentity.set(identity, item);
  }
  return Array.from(byIdentity.values()).sort((a, b) =>
    a.name.localeCompare(b.name) || a.version.localeCompare(b.version) || a.license.localeCompare(b.license)
  );
}

function evaluateLicenseInventory(entries) {
  const missing = [];
  const unreviewed = [];
  for (const entry of entries || []) {
    if (!entry.license) {
      missing.push(entry);
    } else if (!REVIEWED_LICENSE_EXPRESSIONS.has(entry.license)) {
      unreviewed.push(entry);
    }
  }
  return { ok: missing.length === 0 && unreviewed.length === 0, missing, unreviewed };
}

function createInventory(entries) {
  const counts = {};
  for (const entry of entries) counts[entry.license] = (counts[entry.license] || 0) + 1;
  return {
    source: 'package-lock.json',
    packageCount: entries.length,
    licenseCounts: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
    packages: entries,
  };
}

function loadCurrentInventory(rootDir = process.cwd()) {
  const lockPath = path.join(rootDir, 'package-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  return createInventory(collectRuntimeLicenses(lock.packages));
}

function main() {
  const rootDir = process.cwd();
  const inventoryPath = path.join(rootDir, 'licenses', 'npm-runtime-licenses.json');
  const inventory = loadCurrentInventory(rootDir);
  const policy = evaluateLicenseInventory(inventory.packages);
  if (!policy.ok) {
    for (const entry of policy.missing) process.stderr.write('Missing license: ' + entry.name + '@' + entry.version + '\n');
    for (const entry of policy.unreviewed) process.stderr.write('Unreviewed license: ' + entry.name + '@' + entry.version + ' (' + entry.license + ')\n');
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes('--write')) {
    fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
    process.stdout.write('Wrote reviewed runtime license inventory for ' + inventory.packageCount + ' packages.\n');
    return;
  }

  if (!fs.existsSync(inventoryPath)) {
    process.stderr.write('Runtime license inventory is missing. Run npm run licenses:generate.\n');
    process.exitCode = 1;
    return;
  }
  const recorded = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  if (JSON.stringify(recorded) !== JSON.stringify(inventory)) {
    process.stderr.write('Runtime license inventory is stale. Run npm run licenses:generate and review the diff.\n');
    process.exitCode = 1;
    return;
  }
  process.stdout.write('Runtime license inventory is current: ' + inventory.packageCount + ' packages.\n');
}

if (require.main === module) main();

module.exports = {
  REVIEWED_LICENSE_EXPRESSIONS,
  collectRuntimeLicenses,
  createInventory,
  evaluateLicenseInventory,
  loadCurrentInventory,
  packageNameFromLockPath,
};
