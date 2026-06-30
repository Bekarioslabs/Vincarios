# Changelog

All notable changes to ZEUS Agent will be documented here.

This project follows a practical pre-1.0 changelog style while the V1 rebuild is in progress.

## Unreleased

### Added

- Clean Electron V1 rebuild foundation.
- Local-first provider baseline for LM Studio and Ollama.
- Vault open, file tree, Markdown preview, source/edit preview, and internal Markdown link navigation.
- Explicit Read/Write permission UI for files and folders.
- Context Basket for explicit provider context.
- Selection Actions for deterministic file and folder workflows.
- Review Basket with reviewed create/update note execution.
- Diff preview, backup, stale-content checks, and audit logging for reviewed updates.
- Renderer Content Security Policy.
- Payload-size guards for create/update note content and provider message payloads.
- GitHub Actions CI for JavaScript syntax checks and Node tests.

### Changed

- Rebuild architecture separates main, renderer, shared action schema, provider services, vault services, and settings services.
- V1 scope is narrowed around safe Markdown/vault workflows instead of broad autonomous agent behavior.

### Security

- Providers cannot read or write vault files directly.
- Main process validates vault paths and blocks dot-folder access.
- Existing-file writes require review, backup, and audit logging.
