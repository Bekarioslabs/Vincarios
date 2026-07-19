# vitruvios

**Local-first Markdown assistant.**

vitruvios is a local-first Markdown and project workspace for safely analyzing, organizing, connecting, and updating notes through visible, reviewable actions. It works well with Obsidian-style vaults without attempting to replace Obsidian.

## Status

V1 is in beta-release preparation. This repository currently runs from source as an Electron project; a signed installer is not available yet.

## What V1 Does

- Opens and browses local Markdown vaults with File Tree, Preview, Recent Files, Vault Home, and deterministic Search.
- Supports LM Studio and Ollama as local providers.
- Uses explicit Context Basket items and Read permission before note content can be sent to a provider.
- Provides Similar Notes through local embeddings plus deterministic relevance signals.
- Creates and updates Markdown notes through a visible Review Basket, diff, backup, stale-content check, and audit log.
- Supports deterministic notes/projects from presets, Inbox reports, built-in Light/Dark theme packs, and Editor Light formatting.

## Trust Boundaries

- Providers generate text only. They do not receive filesystem access and never read or write vault files directly.
- Local navigation, Preview, Search, and index building do not require Read permission and do not add note content to provider requests.
- `R` allows an explicitly added file or folder snapshot to become provider context. `W` allows a write proposal to be created; it never writes silently.
- Existing-note changes remain reviewed whole-note proposals. They need a visible diff, backup, stale-content validation, and an audit entry before execution.
- Protected runtime/configuration folders, including `.obsidian` and `.vitruvios`, are blocked from normal note actions.
- V1 uses local providers by default. Any future remote-provider integration must be explicitly opt-in and separately communicate its data boundary.

## Local Data

vitruvios keeps app-local state beside the app in `.vitruvios/` (Electron data, cache, and app settings). Each opened vault may contain its own `.vitruvios/` folder for rebuildable indexes, recent-file history, Review Basket working state, backups, and audit logs.

Do not commit private vault data, `.obsidian/`, `.vitruvios/`, model caches, backups, or `.env` files. The supplied `.gitignore` covers the local development defaults.

## Run From Source On Windows

Requirements:

- Node.js `>= 22.12.0`
- A local provider is optional for browsing and Search; use LM Studio or Ollama for chat and provider-backed actions.

```powershell
npm ci
npm start
```

`start.bat` is an alternative launcher. It keeps Electron user data and disk cache inside the project-local `.vitruvios/` folder. If no local Electron runtime exists yet, run `npm ci` first.

## Verify The Project

```powershell
npm test
```

The suite includes JavaScript checks and focused Node tests for renderer, main-process services, safety boundaries, indexing, review flows, and state modules.

## V1 Limits

- No cloud provider is configured by default.
- No trusted/yolo mode or silent vault writes.
- Existing-note updates replace the reviewed whole Markdown note; partial section editing is planned for V1.1.
- No plugin system, full Obsidian-plugin compatibility, vision workflows, PDF/audio/video handling, mobile app, or multi-window workflow.
- Theme Editor/shareable theme packages, advanced YAML editing, link repair, drag-and-drop move, and batch internal-link insertion are V1.1 candidates.

## Project Docs

- [V1 Product Brief](docs/rebuild/VITRUVIOS_V1_PRODUCT_BRIEF.md)
- [V1 Architecture](docs/rebuild/VITRUVIOS_V1_ARCHITECTURE.md)
- [Safety Rules](docs/rebuild/VITRUVIOS_V1_SAFETY_RULES.md)
- [Implementation Plan](docs/rebuild/VITRUVIOS_V1_IMPLEMENTATION_PLAN.md)
- [Tests and Audits](docs/rebuild/VITRUVIOS_V1_TESTS_AND_AUDITS.md)
- [Restore a Note From Backup](docs/RESTORE_FROM_BACKUP.md)
- [Security Policy](SECURITY.md)