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
- GitHub CI

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
