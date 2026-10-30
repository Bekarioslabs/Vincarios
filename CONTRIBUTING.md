# Contributing To vincarios

Feature development has ended. This is an unmaintained source snapshot, with no further development, updates, technical support, issue triage, pull-request reviews or merges. Issues and pull requests are not accepted; security reports will not be processed or answered. Continue the project in an independent fork rather than waiting for an upstream response.

## Product Boundary

vincarios is a local-first Markdown and project workspace with Obsidian-style vault compatibility. It is not a second Obsidian, a general agent platform, or a cloud AI client. The following guidance is retained for people studying or maintaining a fork, not as an invitation to an active upstream roadmap.

Before adding a large feature in a fork, check:

- Does it improve Markdown/vault organization?
- Does it work through visible, reviewable actions?
- Does it preserve local-first privacy?
- Does it fit the current module boundaries?

## Development Setup

```bash
npm ci
npm run check
npm test
```

On Windows, run `npm start` once after dependency installation so Electron can download its desktop runtime if needed. `start.bat` is an alternative launcher after that initial launch. See README for model provisioning and Windows self-build instructions. Upstream publishes source, not a ready-to-run EXE.

## Required Checks

Before distributing or reviewing changes in a fork, run:

```bash
npm run audit:security
npm run licenses:check
npm test
```

The retained CI workflow runs policy/test gates and checks Windows packaging without uploading an executable. Fork maintainers must choose their own distribution, security and support policy.

## Architecture Rules

- Providers generate text only. They must not read or write vault files.
- Renderer code must use the preload bridge, not direct filesystem access.
- Main-process vault services own path validation and file operations.
- Existing-file writes must go through Review Basket, diff preview, backup, and audit logging.
- Keep behavior in the owning module. Do not add one-off prompt or typo patches.
- Prefer deterministic app state and Selection Actions over broad language-trigger guessing.

See `AGENTS.md` and `docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md` before changing architecture.

## Guidelines For Fork Changes

A focused change should:

- stay focused on one behavior or module area
- include or update tests for changed behavior
- update the relevant doc in `docs/rebuild/` when user-visible behavior, safety, providers, permissions, or workflows change
- avoid private vault data, local paths, API keys, backups, and `.obsidian` content

## Contribution License

The existing source is licensed under GPL-3.0-only. Independent forks and redistribution must comply with the project license and third-party notices. This document is not a separate license or a promise to accept contributions.

## Commit Style

Use short, descriptive English commit messages.

Examples:

```text
Add reviewed update payload guards
Improve selection action permission guidance
Document provider safety boundary
```
