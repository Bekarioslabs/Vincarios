# ZEUS V1 Tests And Audits

## Test Principle

Tests start on day one. Safety-critical behavior must be tested before feature polish.

## Required V1 Test Areas

- path safety: no access outside the selected vault
- dot-folder blocking: `.obsidian`, `.zeus`, `.zeus_backups`
- action schema validation
- review basket state: open, selected, running, done, failed, rejected, stale
- permission inheritance: direct, inherited, blocked/off
- context builder: only allowed context is included
- Markdown diff and patch behavior
- backup before existing-file changes
- archive/trash instead of normal delete
- audit log without note contents
- provider boundary: providers never read/write files
- renderer runtime parity: renderer modules prefer `window.Zeus...` browser APIs before Node/CommonJS test fallbacks
- embedding index basics: Markdown-only, local, hash/mtime updates

## Focused Audit Rhythm

Run focused audits after each major block instead of one giant late audit.

1. scaffold and dependency choice
2. vault path/safety layer
3. action schema and review store
4. permissions and context builder
5. provider integration
6. embedding index
7. first full inbox cleanup workflow
8. pre-V1 freeze

## Minimum Commands

The exact command set can change with the stack, but V1 must have:

```text
npm test
npm run check
```

Before public release, add:

- dependency audit
- secret scan
- Electron/security scan if still using Electron
- GitHub CI for JavaScript syntax checks and Node tests

## Manual Smoke Areas

- open vault
- configure vault profile
- select file/folder
- toggle R/W permissions
- ask for folder analysis
- review suggestions
- execute selected suggestions
- verify backup and audit log
- rebuild embedding index
- create new project

## GitHub CI

V1 uses `.github/workflows/ci.yml` to run the same core checks on GitHub that should pass locally:

```text
npm audit --audit-level=high
npm run check
node --test tests/*.test.js
```

The workflow runs on pushes to `main` and `codex/**`, and on pull requests targeting `main`.

## Audit Records

### 2026-06-30 dependency/security audit

Method:

- Parsed `package-lock.json`.
- Queried the npm Security Advisory bulk endpoint for all locked packages.

Result:

- 13 locked packages checked.
- 0 advisories returned.

Note:

- The local Codex shell did not expose `npm`, so `npm audit` could not be run directly in this environment. The advisory check used the same npm security advisory source over the registry API.

### 2026-06-30 external security audit follow-up

Resolved immediately:

- Pinned Electron from `^42.4.1` to `42.4.1` for release reproducibility.
- Added `engines.node >=22.12.0` to `package.json`.
- Added `npm audit --audit-level=high` to GitHub CI.

Already verified in code/tests before this follow-up:

- Renderer CSP exists in `index.html` and is covered by `tests/browserScriptIsolation.test.js`.
- Payload limits exist in `src/shared/security/payloadLimits.js` and oversized write/provider payloads are covered by focused tests.
- BrowserWindow keeps `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`, and `allowRunningInsecureContent: false`; covered by `tests/electronShell.test.js`.

Deferred decisions:

- ASAR/fuse integrity belongs to the future package/build phase.
- Public license choice remains a pre-public-release decision.
- Clipboard image handling belongs to the future image-feature phase.
