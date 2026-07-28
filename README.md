# vincarios

**Local-first Markdown assistant.**

vincarios is a local-first Markdown and project workspace for safely analyzing, organizing, connecting, and updating notes through visible, reviewable actions. It works well with Obsidian-style vaults without attempting to replace Obsidian.

## Status

vincarios is preparing **v0.1.0-beta.1**, a Windows-only public beta for local-first Markdown vault workflows. Use a copy of a vault or a test vault first. The beta is functional, but not yet a stable release; feedback is welcome through [GitHub Issues](https://github.com/Bekarioslabs/Vincarios/issues).

A signed installer is not available yet. vincarios is licensed under GPL-3.0-only.

## Development Approach

vincarios is developed with AI assistance and human oversight. Changes are reviewed against the project's safety architecture, covered by automated checks where practical, and validated through manual smoke tests before release.

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
- Protected runtime/configuration folders, including `.obsidian` and `.vincarios`, are blocked from normal note actions.
- V1 uses local providers by default. If a configured endpoint is classified as external, private provider context requires explicit consent for that endpoint.

## Local Data

vincarios keeps app-local state beside the app in `.vincarios/` (Electron data, cache, and app settings). Each opened vault may contain its own `.vincarios/` folder for rebuildable indexes, recent-file history, Review Basket working state, backups, and audit logs.

Do not commit private vault data, `.obsidian/`, `.vincarios/`, model caches, backups, or `.env` files. The supplied `.gitignore` covers the local development defaults.

## Run From Source On Windows

Requirements:

- Node.js `>= 22.12.0`
- A local provider is optional for browsing and Search; use LM Studio or Ollama for chat and provider-backed actions.

```powershell
npm ci
npm start
```

`start.bat` is an alternative launcher. It keeps Electron user data and disk cache inside the project-local `.vincarios/` folder. If no local Electron runtime exists yet, run `npm ci` first.

The local embedding model is required only for embedding-backed features and packaging. A clean checkout can provision the six hash-pinned artifacts from their pinned Hugging Face revision:

```powershell
npm run model:provision
npm run model:verify
```

## Verify The Project

```powershell
npm run audit:security
npm run licenses:check
npm test
```

The suite includes JavaScript checks and focused Node tests for renderer, main-process services, safety boundaries, indexing, review flows, state modules, dependency policy, model integrity, and packaging contracts.

## Build The Windows Portable Candidate

```powershell
npm ci
npm run model:provision
npm run build:win
```

The output is written to `release/`. V1 is Windows-only and unsigned; private testers should expect Windows SmartScreen guidance until code signing is introduced. Release artifacts must be built from a clean checkout and published with their source revision and SHA256 checksum.

## V1 Limits

- No cloud provider is configured by default.
- No trusted/yolo mode or silent vault writes.
- Existing-note updates replace the reviewed whole Markdown note; partial section editing is planned for V1.1.
- No plugin system, full Obsidian-plugin compatibility, vision workflows, PDF/audio/video handling, mobile app, or multi-window workflow.
- Theme Editor/shareable theme packages, advanced YAML editing, link repair, drag-and-drop move, and batch internal-link insertion are V1.1 candidates.

## License

Copyright (C) 2026 Bekarios Labs. vincarios is licensed under the GNU General Public License v3.0 only. See [LICENSE](LICENSE).

## Documentation

- [Product Brief](docs/rebuild/VINCARIOS_V1_PRODUCT_BRIEF.md)
- [Architecture](docs/rebuild/VINCARIOS_V1_ARCHITECTURE.md)
- [Safety Rules](docs/rebuild/VINCARIOS_V1_SAFETY_RULES.md)
- [Restore a Note From Backup](docs/RESTORE_FROM_BACKUP.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [Third-Party Notices](THIRD_PARTY_NOTICES.md)
