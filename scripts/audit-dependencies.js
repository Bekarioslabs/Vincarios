'use strict';

const fs = require('node:fs');

function evaluateAuditReport(report) {
  if (!report
    || typeof report !== 'object'
    || Array.isArray(report)
    || report.error
    || !report.vulnerabilities
    || typeof report.vulnerabilities !== 'object'
    || Array.isArray(report.vulnerabilities)) {
    return {
      ok: false,
      message: 'npm audit report is incomplete or contains an error.',
      unexpected: [],
      advisories: [],
    };
  }
  const vulnerabilities = report && report.vulnerabilities || {};
  const unexpected = [];
  const allAdvisories = new Set();

  for (const name of Object.keys(vulnerabilities)) {
    const advisories = Array.from(collectAdvisories(name, vulnerabilities, new Set())).sort();
    advisories.forEach((id) => allAdvisories.add(id));
    unexpected.push({ name, advisories });
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

function evaluateAuditJson(json) {
  if (!json || !json.trim()) {
    return { ok: false, message: 'npm audit produced no JSON output.' };
  }
  try {
    return evaluateAuditReport(JSON.parse(json));
  } catch (error) {
    return { ok: false, message: 'npm audit output could not be parsed.' };
  }
}

function runAudit(json = fs.readFileSync(0, 'utf8')) {
  return evaluateAuditJson(json);
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
  process.stdout.write('Full dependency audit is clean.\n');
}

if (require.main === module) main();

module.exports = {
  evaluateAuditReport,
  evaluateAuditJson,
  runAudit,
};
