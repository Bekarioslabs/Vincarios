'use strict';

const { spawnSync } = require('node:child_process');

const KNOWN_BUILD_ONLY_ADVISORY = 'GHSA-mh99-v99m-4gvg';
const KNOWN_BUILD_PACKAGES = new Set([
  '@electron/asar',
  '@electron/universal',
  'app-builder-lib',
  'brace-expansion',
  'dir-compare',
  'dmg-builder',
  'ejs',
  'electron-builder',
  'electron-builder-squirrel-windows',
  'electron-winstaller',
  'filelist',
  'glob',
  'jake',
  'minimatch',
  'rimraf',
  'temp',
]);

function evaluateAuditReport(report) {
  const vulnerabilities = report && report.vulnerabilities || {};
  const unexpected = [];
  const allAdvisories = new Set();

  for (const name of Object.keys(vulnerabilities)) {
    const advisories = Array.from(collectAdvisories(name, vulnerabilities, new Set())).sort();
    advisories.forEach((id) => allAdvisories.add(id));
    const expected = KNOWN_BUILD_PACKAGES.has(name)
      && advisories.length === 1
      && advisories[0] === KNOWN_BUILD_ONLY_ADVISORY;
    if (!expected) unexpected.push({ name, advisories });
  }

  return {
    ok: unexpected.length === 0,
    advisories: Array.from(allAdvisories).sort(),
    unexpected,
  };
}

function collectAdvisories(name, vulnerabilities, visited) {
  if (visited.has(name)) return new Set();
  visited.add(name);
  const vulnerability = vulnerabilities[name];
  if (!vulnerability || !Array.isArray(vulnerability.via)) return new Set(['unresolved:' + name]);
  const advisories = new Set();
  for (const via of vulnerability.via) {
    if (typeof via === 'string') {
      collectAdvisories(via, vulnerabilities, new Set(visited)).forEach((id) => advisories.add(id));
      continue;
    }
    const id = advisoryId(via);
    if (id) advisories.add(id);
  }
  return advisories;
}

function advisoryId(value) {
  const url = String(value && value.url || '');
  const match = url.match(/\/advisories\/(GHSA-[A-Za-z0-9-]+)(?:$|[?#/])/);
  return match ? match[1] : '';
}

function runAudit() {
  const npmCli = String(process.env.npm_execpath || '');
  const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const args = npmCli ? [npmCli, 'audit', '--json'] : ['audit', '--json'];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (!result.stdout) {
    return { ok: false, message: result.stderr || 'npm audit produced no JSON output.' };
  }
  try {
    return evaluateAuditReport(JSON.parse(result.stdout));
  } catch (error) {
    return { ok: false, message: 'npm audit output could not be parsed.' };
  }
}

function main() {
  const result = runAudit();
  if (!result.ok) {
    process.stderr.write((result.message || 'Unexpected dependency vulnerabilities detected.') + '\n');
    for (const entry of result.unexpected || []) {
      process.stderr.write('- ' + entry.name + ': ' + (entry.advisories.join(', ') || 'unresolved') + '\n');
    }
    process.exitCode = 1;
    return;
  }
  if (result.advisories.length === 0) {
    process.stdout.write('Full dependency audit is clean.\n');
    return;
  }
  process.stdout.write('Only documented build-time advisory remains: ' + result.advisories.join(', ') + '.\n');
}

if (require.main === module) main();

module.exports = {
  KNOWN_BUILD_ONLY_ADVISORY,
  evaluateAuditReport,
  runAudit,
};
