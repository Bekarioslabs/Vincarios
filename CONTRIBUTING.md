# Contributing To Vitruvios

Thanks for considering a contribution. Vitruvios is still a V1 rebuild, so the most valuable contributions are small, tested, and aligned with the safety model.

## Product Boundary

Vitruvios is a local-first assistant for Obsidian-style Markdown vault organization. It complements Obsidian; it is not a second Obsidian, a general agent platform, or a cloud AI client.

Before proposing a large feature, check:

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

On Windows, `start.bat` can launch the local Electron app when `npm` is not available in the active shell.

## Required Checks

Before opening a pull request, run:

```bash
npm run check
npm test
```

The GitHub CI workflow runs the same core checks.

## Architecture Rules

- Providers generate text only. They must not read or write vault files.
- Renderer code must use the preload bridge, not direct filesystem access.
- Main-process vault services own path validation and file operations.
- Existing-file writes must go through Review Basket, diff preview, backup, and audit logging.
- Keep behavior in the owning module. Do not add one-off prompt or typo patches.
- Prefer deterministic app state and Selection Actions over broad language-trigger guessing.

See `AGENTS.md` and `docs/rebuild/VITRUVIOS_V1_ARCHITECTURE.md` before changing architecture.

## Pull Request Guidelines

A good PR should:

- stay focused on one behavior or module area
- include or update tests for changed behavior
- update the relevant doc in `docs/rebuild/` when user-visible behavior, safety, providers, permissions, or workflows change
- avoid private vault data, local paths, API keys, backups, and `.obsidian` content

## Commit Style

Use short, descriptive English commit messages.

Examples:

```text
Add reviewed update payload guards
Improve selection action permission guidance
Document provider safety boundary
```
